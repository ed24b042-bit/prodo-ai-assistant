import json
from datetime import datetime, timedelta, timezone
from services.gemini_service import call_gemini_json
from services.firestore_service import (
    get_conversation_state, save_conversation_state,
    delete_task_db, update_task_db
)
from services.calendar_service import delete_calendar_event, create_calendar_event
from agents.brain import extract_task_details, check_missing_information, schedule_task

async def resolve_draft_list(draft_task: dict, uid: str):
    from services.firestore_service import db
    try:
        user_doc = db.collection("users").document(uid).get()
        board_lists = []
        if user_doc.exists:
            board_lists = user_doc.to_dict().get("boardLists", [])
    except Exception:
        board_lists = []

    if not board_lists:
        board_lists = [
            {"id": "list-1", "name": "List 1", "color": "rose"},
            {"id": "list-2", "name": "List 2", "color": "emerald"},
            {"id": "list-3", "name": "List 3", "color": "sky"},
            {"id": "list-4", "name": "List 4", "color": "purple"}
        ]

    extracted_list_name = draft_task.get("listName")
    matched = False
    if extracted_list_name:
        for bl in board_lists:
            if bl.get("name", "").lower().strip() == extracted_list_name.lower().strip():
                draft_task["listId"] = bl["id"]
                draft_task["listName"] = bl["name"]
                matched = True
                break
                
    if not matched and not draft_task.get("listId"):
        draft_task["listId"] = board_lists[0]["id"]
        draft_task["listName"] = board_lists[0]["name"]

async def run_planner(
    user_message: str,
    current_datetime: str,
    existing_tasks: list[dict],
    long_term_memory: list[str],
    habit_logs: list[dict],
    uid: str
) -> dict:
    state = await get_conversation_state(uid)
    intent = state.get("last_user_intent", "create_task")
    draft_task = state.get("draft_task") or {}
    
    tasks_to_save = []
    response_metadata = {
        "intent": intent,
        "action_taken": None,
        "message": None,
        "missing_fields": [],
        "proposed_task": None
    }
    
    if intent == "confirm":
        if state.get("confirmation_state") == "pending_confirmation" and draft_task:
            await resolve_draft_list(draft_task, uid)
            scheduled_task = schedule_task(draft_task, existing_tasks, current_datetime, habit_logs, long_term_memory)
            scheduled_task["status"] = "pending"
            tasks_to_save.append(scheduled_task)
            
            response_metadata["action_taken"] = "scheduled"
            response_metadata["proposed_task"] = scheduled_task
            
            state["draft_task"] = None
            state["confirmation_state"] = None
            state["last_assistant_question"] = None
            state["missing_fields"] = []
        else:
            response_metadata["action_taken"] = "no_draft_to_confirm"
            
    elif intent == "reject":
        if state.get("confirmation_state") == "pending_confirmation" and draft_task:
            response_metadata["action_taken"] = "cancelled"
            response_metadata["cancelled_task_title"] = draft_task.get("title")
            
            state["draft_task"] = None
            state["confirmation_state"] = None
            state["last_assistant_question"] = None
            state["missing_fields"] = []
        else:
            response_metadata["action_taken"] = "no_draft_to_reject"
            
    elif intent in ["create_task", "answer_question", "edit_task"]:
        updated_draft = extract_task_details(user_message, current_datetime, draft_task, state.get("last_assistant_question"))
        await resolve_draft_list(updated_draft, uid)
        state["draft_task"] = updated_draft
        
        missing = check_missing_information(updated_draft)
        state["missing_fields"] = missing
        
        if missing:
            first_missing = missing[0]
            state["last_assistant_question"] = first_missing
            state["confirmation_state"] = None
            
            response_metadata["action_taken"] = "ask_missing"
            response_metadata["missing_fields"] = missing
        else:
            prompt_confirm = f"""Analyze the draft task details and user message: "{user_message}".
Draft Task: {updated_draft}

Did the user explicitly state the date and start time for this task (e.g. 'tomorrow at 10', 'tonight at 5pm')?
Return ONLY valid JSON:
{{
  "user_specified_time": true/false
}}"""
            user_specified_time = False
            try:
                res_confirm = call_gemini_json(prompt_confirm)
                user_specified_time = bool(res_confirm.get("user_specified_time", False))
            except Exception:
                pass
                
            scheduled_task = schedule_task(updated_draft, existing_tasks, current_datetime, habit_logs, long_term_memory)
            
            if user_specified_time:
                scheduled_task["status"] = "pending"
                tasks_to_save.append(scheduled_task)
                
                response_metadata["action_taken"] = "scheduled_auto"
                response_metadata["proposed_task"] = scheduled_task
                
                state["draft_task"] = None
                state["confirmation_state"] = None
                state["last_assistant_question"] = None
                state["missing_fields"] = []
            else:
                state["draft_task"]["startTime"] = scheduled_task["startTime"]
                state["draft_task"]["endTime"] = scheduled_task["endTime"]
                state["draft_task"]["date"] = scheduled_task["date"]
                
                state["confirmation_state"] = "pending_confirmation"
                state["last_assistant_question"] = "confirmation"
                
                response_metadata["action_taken"] = "propose_slot"
                response_metadata["proposed_task"] = scheduled_task
                
    elif intent == "complete_task":
        prompt_find = f"""User message: "{user_message}"
Tasks: {[{'id': t['id'], 'title': t['title']} for t in existing_tasks]}

Identify the ID of the task the user wants to mark complete.
Return ONLY valid JSON:
{{
  "task_id": "matching task ID or null"
}}"""
        matched_id = None
        try:
            res_find = call_gemini_json(prompt_find)
            matched_id = res_find.get("task_id")
        except Exception:
            pass
            
        if matched_id and matched_id != "null":
            await update_task_db(uid, matched_id, {"status": "completed", "completedAt": datetime.utcnow().isoformat()})
            task_obj = next((t for t in existing_tasks if t["id"] == matched_id), None)
            if task_obj:
                task_obj["status"] = "completed"
                await create_calendar_event(uid, task_obj)
                response_metadata["action_taken"] = "completed"
                response_metadata["task_title"] = task_obj["title"]
            else:
                response_metadata["action_taken"] = "completed_unknown"
        else:
            response_metadata["action_taken"] = "complete_not_found"
            
    elif intent == "delete_task":
        prompt_find = f"""User message: "{user_message}"
Tasks: {[{'id': t['id'], 'title': t['title']} for t in existing_tasks]}

Identify the ID of the task the user wants to delete.
Return ONLY valid JSON:
{{
  "task_id": "matching task ID or null"
}}"""
        matched_id = None
        try:
            res_find = call_gemini_json(prompt_find)
            matched_id = res_find.get("task_id")
        except Exception:
            pass
            
        if matched_id and matched_id != "null":
            task_obj = next((t for t in existing_tasks if t["id"] == matched_id), None)
            if task_obj:
                await delete_task_db(uid, matched_id)
                cal_evt_id = task_obj.get("calendar_event_id") or task_obj.get("calendarEventId")
                if cal_evt_id:
                    await delete_calendar_event(uid, cal_evt_id)
                response_metadata["action_taken"] = "deleted"
                response_metadata["task_title"] = task_obj["title"]
            else:
                response_metadata["action_taken"] = "deleted_unknown"
        else:
            response_metadata["action_taken"] = "delete_not_found"

    await save_conversation_state(uid, state)
    
    return {
        "tasks": tasks_to_save,
        "metadata": response_metadata
    }
