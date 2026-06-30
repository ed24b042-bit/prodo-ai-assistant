import json
from services.gemini_service import call_gemini, call_gemini_json
from services.firestore_service import get_conversation_state, save_conversation_state
from datetime import datetime, timedelta

def classify_intent(user_message: str, last_assistant_question: str | None, draft_task: dict | None, history: list) -> str:
    prompt = f"""You are Prodo's intent classifier. Analyze the user's message and the conversation context to classify the user's intent.

User Message: "{user_message}"
Last Assistant Question: "{last_assistant_question}"
Current Draft Task: {draft_task}
Recent history: {history[-5:] if history else []}

Choose exactly one intent from this list:
- "create_task": User wants to create a new task (e.g. "I have a presentation", "need to do gym", "write code").
- "edit_task": User wants to edit or reschedule an existing task (e.g. "change time of meeting to 3pm", "move gym to tomorrow", "edit the title").
- "delete_task": User wants to delete or cancel a task.
- "complete_task": User wants to mark a task as completed/done (e.g. "finish presentation", "gym is done").
- "answer_question": User is answering a previous question from the assistant (e.g. giving duration like "4 hours", "30 mins", or a time/date in response to a question).
- "confirm": User is confirming/agreeing to schedule the task (e.g. "yes", "do it", "sure", "okay", "correct", "yep").
- "reject": User is rejecting/stopping the scheduling of the task (e.g. "no", "don't schedule it", "cancel").
- "greeting": Saying hello/hi.
- "general_conversation": General chat or questions.

Return ONLY a JSON block:
{{
  "intent": "one of the intents above",
  "reasoning": "one sentence explanation"
}}"""
    try:
        res = call_gemini_json(prompt)
        return res.get("intent", "general_conversation")
    except Exception as e:
        print(f"Error classifying intent: {e}")
        return "general_conversation"

def extract_task_details(user_message: str, current_datetime: str, draft_task: dict | None, last_assistant_question: str | None) -> dict:
    prompt = f"""You are Prodo's task extraction agent. Analyze the user's message and update the draft task details.

Current Datetime: {current_datetime}
User Message: "{user_message}"
Current Draft Task: {draft_task}
Last Assistant Question: "{last_assistant_question}"

Instructions:
1. Extract or update these fields. Keep existing draft values if not mentioned/updated.
   - "title": string (make it specific. Never make it 'yes', 'no', 'tomorrow', '4 hours', 'do')
   - "date": string (vague date like 'tomorrow', 'today', or 'YYYY-MM-DD')
   - "startTime": string (e.g. '10:00 AM' or '14:00' or ISO time)
   - "duration": number (duration in minutes. E.g. '4 hours' = 240, '30 mins' = 30)
   - "priority": number (0-100)
   - "description": string (priority reasoning or description)
   - "listName": string (the list or category name if specified, e.g. 'List 1', 'List 2', 'Work', 'Personal', etc.)

Return ONLY valid JSON:
{{
  "title": "string or null",
  "date": "string or null",
  "startTime": "string or null",
  "duration": number or null,
  "priority": number or null,
  "description": "string or null",
  "listName": "string or null"
}}"""
    try:
        res = call_gemini_json(prompt)
        updated = {}
        if draft_task:
            updated.update(draft_task)
        
        for k in ["title", "date", "startTime", "duration", "priority", "description", "listName"]:
            val = res.get(k)
            if val is not None and val != "null" and val != "unknown":
                if k in ["duration", "priority"]:
                    try:
                        updated[k] = int(val)
                    except ValueError:
                        pass
                else:
                    updated[k] = str(val)
        
        title = updated.get("title", "")
        if title:
            lower_title = title.lower().strip()
            if lower_title in ["yes", "no", "okay", "fine", "do", "done", "4 hours", "tomorrow", "unknown"]:
                updated["title"] = None

        return updated
    except Exception as e:
        print(f"Error extracting task details: {e}")
        return draft_task or {}

def check_missing_information(draft_task: dict) -> list[str]:
    missing = []
    if not draft_task.get("title"):
        missing.append("title")
    if not draft_task.get("date") and not draft_task.get("startTime"):
        missing.append("date")
    if not draft_task.get("startTime"):
        missing.append("startTime")
    if not draft_task.get("duration"):
        missing.append("duration")
    return missing

def resolve_datetime(date_str: str, time_str: str, current_datetime: str) -> datetime:
    prompt = f"""You are a date and time resolver.
Current Datetime: {current_datetime}
Proposed Date: "{date_str}"
Proposed Time: "{time_str}"

Resolve this into a single ISO8601 datetime string representing the start time.
Return ONLY valid JSON:
{{
  "resolved_datetime": "ISO8601 string or null"
}}"""
    try:
        res = call_gemini_json(prompt)
        dt_str = res.get("resolved_datetime")
        if dt_str:
            return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception as e:
        print(f"Error resolving datetime: {e}")
    
    return datetime.now() + timedelta(hours=1)

def schedule_task(
    draft_task: dict,
    existing_tasks: list[dict],
    current_datetime: str,
    habit_logs: list[dict],
    long_term_memory: list[str]
) -> dict:
    start_dt = resolve_datetime(
        draft_task.get("date", "today"),
        draft_task.get("startTime", "12:00 PM"),
        current_datetime
    )
    duration = int(draft_task.get("duration", 60))
    end_dt = start_dt + timedelta(minutes=duration)

    clean_tasks = []
    for t in existing_tasks:
        if t.get("status") not in ["completed", "missed", "cancelled"]:
            s_start = t.get("scheduled_start") or t.get("startTime")
            s_end = t.get("scheduled_end") or t.get("endTime")
            if s_start and s_end:
                clean_tasks.append({
                    "scheduled_start": s_start,
                    "scheduled_end": s_end
                })

    has_conflict = True
    attempts = 0
    start_dt = start_dt.replace(tzinfo=None)
    end_dt = end_dt.replace(tzinfo=None)

    while has_conflict and attempts < 100:
        has_conflict = False
        for ext in clean_tasks:
            try:
                ext_start = datetime.fromisoformat(ext["scheduled_start"].replace("Z", "")).replace(tzinfo=None)
                ext_end = datetime.fromisoformat(ext["scheduled_end"].replace("Z", "")).replace(tzinfo=None)
            except Exception:
                continue
            
            if max(start_dt, ext_start) < min(end_dt, ext_end):
                has_conflict = True
                start_dt = ext_end
                end_dt = start_dt + timedelta(minutes=duration)
                attempts += 1
                break

    prompt = f"""You are Prodo's priority engine.
Analyze this task details and assign a priority score (0-100), priority reasoning, and color.
Task Title: "{draft_task.get('title')}"
Task Description: "{draft_task.get('description')}"
User preferences: {long_term_memory}

Return ONLY valid JSON:
{{
  "priority_score": 0-100,
  "priority_reasoning": "one sentence explanation",
  "color": "#ef4444 for high priority (80+), #6366f1 for medium (40-79), #22c55e for low (<40)"
}}"""
    priority_score = 50
    priority_reasoning = "Scheduled by Prodo"
    color = "#6366f1"
    try:
        res = call_gemini_json(prompt)
        priority_score = int(res.get("priority_score", 50))
        priority_reasoning = res.get("priority_reasoning", "Scheduled by Prodo")
        color = res.get("color", "#6366f1")
    except Exception:
        pass

    start_iso = start_dt.isoformat()
    end_iso = end_dt.isoformat()

    return {
        "title": draft_task.get("title"),
        "description": priority_reasoning,
        "date": start_dt.strftime("%Y-%m-%d"),
        "dueDate": start_dt.strftime("%Y-%m-%d"),
        "startTime": start_iso,
        "endTime": end_iso,
        "duration": duration,
        "priority": priority_score,
        "status": "pending",
        "priority_score": priority_score,
        "priority_reasoning": priority_reasoning,
        "color": color,
        "scheduled_start": start_iso,
        "scheduled_end": end_iso,
        "duration_minutes": duration,
        "listId": draft_task.get("listId", "list-1"),
        "listName": draft_task.get("listName", "List 1")
    }

async def run_brain(
    user_message: str,
    current_datetime: str,
    conversation_history: list[dict],
    long_term_memory: list[str],
    existing_tasks: list[dict],
    uid: str
) -> dict:
    state = await get_conversation_state(uid)
    last_question = state.get("last_assistant_question")
    draft = state.get("draft_task")
    
    intent = classify_intent(user_message, last_question, draft, conversation_history)
    state["last_user_intent"] = intent
    
    # Save classified intent to persistent state
    await save_conversation_state(uid, state)
    
    # Decide if planning/scheduling flow is needed
    needs_planning = intent in ["create_task", "edit_task", "delete_task", "complete_task", "answer_question", "confirm", "reject"]
    
    # Decide if coaching is needed
    needs_coaching = intent in ["complete_task", "greeting", "general_conversation"]
    
    thinking_label = "planning" if needs_planning else "listening"
    
    return {
        "needs_planning": needs_planning,
        "needs_coaching": needs_coaching,
        "thinking_label": thinking_label
    }

async def generate_final_response(
    user_message: str,
    current_datetime: str,
    conversation_history: list[dict],
    long_term_memory: list[str],
    planner_output: dict | None,
    coach_output: dict | None,
    uid: str
) -> str:
    metadata = planner_output.get("metadata") if planner_output else None
    
    prompt = f"""You are Prodo, a warm and direct AI executive assistant. Generate the final response for the user.

User Message: "{user_message}"
Current Datetime: {current_datetime}
Conversation History (last 5 messages): {conversation_history[-5:] if conversation_history else []}
Long-term memory about user: {long_term_memory}
Planner Action Metadata: {metadata}
Coach Output: {coach_output}

Instructions:
1. Warm and direct personality, never waste user's time. Never use fillers like "Great!", "Certainly!", "Of course!".
2. Reference specific task names and times.
3. If the planner is asking for missing info (action_taken = "ask_missing"): ask exactly one clear question to collect that missing information.
4. If a task was scheduled (action_taken = "scheduled" or "scheduled_auto"): casually confirm that the task is scheduled (mentioning title and time).
5. If we proposed a slot (action_taken = "propose_slot"): ask if the proposed slot works (e.g. "I found a free slot... want me to schedule it then?").
6. If a task was marked completed (action_taken = "completed"): congratulate them casually.
7. If a task was deleted (action_taken = "deleted"): acknowledge it directly.
8. If intent is greeting or general conversation: respond naturally and briefly.

Return ONLY the response text. No formatting, no markdown wrapper, no JSON."""
    try:
        response_text = call_gemini(prompt)
        return response_text
    except Exception as e:
        print(f"Error in generate_final_response: {e}")
        return "I've updated your schedule."
