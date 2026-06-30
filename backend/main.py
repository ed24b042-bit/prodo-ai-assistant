from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel
import json
import os
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

from agents.brain import run_brain, generate_final_response
from agents.planner import run_planner
from agents.coach import run_coach
from agents.memory_agent import run_weekly_memory_cleanup
from services.firestore_service import (
    get_conversation_history, save_message,
    get_long_term_memory, get_existing_tasks,
    get_habit_logs, get_productivity_score,
    save_tasks, update_productivity_score,
    save_habit_log, db, delete_task_db, update_task_db
)
from services.calendar_service import get_auth_url, handle_callback, create_calendar_event, delete_calendar_event
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI()

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
]
if frontend_url not in origins:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()

async def weekly_cleanup_job():
    try:
        users_ref = db.collection("users").stream()
        for doc in users_ref:
            await run_weekly_memory_cleanup(doc.id)
    except Exception as e:
        print(f"Error running weekly cleanup job: {e}")

@app.on_event("startup")
def startup_event():
    scheduler.add_job(weekly_cleanup_job, "interval", days=7)
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

class ChatRequest(BaseModel):
    message: str
    uid: str
    sentAt: Optional[float] = None

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    import time
    start_received = time.time()

    async def generate():
        total_start = time.time()
        print("  [Stage Start] Database reads...", flush=True)
        try:
            # 1. Database reads
            db_read_start = time.time()
            history = await get_conversation_history(req.uid)
            memory = await get_long_term_memory(req.uid)
            tasks = await get_existing_tasks(req.uid)
            logs = await get_habit_logs(req.uid)
            score_data = await get_productivity_score(req.uid)
            db_read_time = (time.time() - db_read_start) * 1000
            print(f"  [Stage Complete] Database reads in {db_read_time:.1f} ms", flush=True)

            # 2. Database write (user message)
            print("  [Stage Start] Database write (user message)...", flush=True)
            db_write_user_start = time.time()
            await save_message(req.uid, "user", req.message)
            db_write_user_time = (time.time() - db_write_user_start) * 1000
            print(f"  [Stage Complete] Database write user in {db_write_user_time:.1f} ms", flush=True)

            # 3. Brain execution (Intent classification)
            print("  [Stage Start] Brain execution (Intent classification)...", flush=True)
            brain_start = time.time()
            yield f"data: {json.dumps({'type': 'thinking', 'label': 'listening'})}\n\n"
            brain_decision = await run_brain(
                user_message=req.message,
                current_datetime=datetime.now().isoformat(),
                conversation_history=history,
                long_term_memory=memory,
                existing_tasks=tasks,
                uid=req.uid
            )
            brain_time = (time.time() - brain_start) * 1000
            print(f"  [Stage Complete] Brain execution in {brain_time:.1f} ms", flush=True)

            planner_output = None
            coach_output = None
            planner_time = 0.0
            coach_time = 0.0

            # 4. Planner execution
            if brain_decision["needs_planning"]:
                print("  [Stage Start] Planner execution...", flush=True)
                planner_start = time.time()
                yield f"data: {json.dumps({'type': 'thinking', 'label': 'planning'})}\n\n"
                planner_output = await run_planner(
                    user_message=req.message,
                    current_datetime=datetime.now().isoformat(),
                    existing_tasks=tasks,
                    long_term_memory=memory,
                    habit_logs=logs,
                    uid=req.uid
                )
                # Save tasks to Firestore + Google Calendar
                if planner_output and planner_output.get("tasks"):
                    await save_tasks(req.uid, planner_output["tasks"])
                    for task in planner_output["tasks"]:
                        if not task.get("needs_user_confirmation"):
                            await create_calendar_event(req.uid, task)
                planner_time = (time.time() - planner_start) * 1000
                print(f"  [Stage Complete] Planner execution in {planner_time:.1f} ms", flush=True)

            # 5. Coach execution
            if brain_decision["needs_coaching"]:
                print("  [Stage Start] Coach execution...", flush=True)
                coach_start = time.time()
                yield f"data: {json.dumps({'type': 'thinking', 'label': 'coaching'})}\n\n"
                coach_output = await run_coach(
                    habit_logs=logs,
                    productivity_score=score_data.get("score", 0),
                    streak_days=score_data.get("streak_days", 0),
                    current_datetime=datetime.now().isoformat(),
                    uid=req.uid
                )
                if coach_output:
                    await update_productivity_score(
                        req.uid,
                        coach_output["new_score"],
                        coach_output["new_streak"]
                    )
                coach_time = (time.time() - coach_start) * 1000
                print(f"  [Stage Complete] Coach execution in {coach_time:.1f} ms", flush=True)

            # 6. Final response generation
            print("  [Stage Start] Final response generation...", flush=True)
            final_start = time.time()
            yield f"data: {json.dumps({'type': 'thinking', 'label': 'responding'})}\n\n"
            final_response = await generate_final_response(
                user_message=req.message,
                current_datetime=datetime.now().isoformat(),
                conversation_history=history,
                long_term_memory=memory,
                planner_output=planner_output,
                coach_output=coach_output,
                uid=req.uid
            )
            final_time = (time.time() - final_start) * 1000
            print(f"  [Stage Complete] Final response generation in {final_time:.1f} ms", flush=True)

            # 7. Database write (assistant response)
            print("  [Stage Start] Database write (assistant response)...", flush=True)
            db_write_assistant_start = time.time()
            await save_message(req.uid, "assistant", final_response)
            db_write_assistant_time = (time.time() - db_write_assistant_start) * 1000
            print(f"  [Stage Complete] Database write assistant in {db_write_assistant_time:.1f} ms", flush=True)

            # 8. Serialization & Emission
            print("  [Stage Start] Serialization & Emission...", flush=True)
            serialization_start = time.time()
            yield f"data: {json.dumps({'type': 'response', 'payload': final_response})}\n\n"
            if planner_output and planner_output.get("tasks"):
                yield f"data: {json.dumps({'type': 'tasks_updated', 'payload': planner_output['tasks']})}\n\n"
            if coach_output:
                yield f"data: {json.dumps({'type': 'score_updated', 'payload': {'score': coach_output['new_score'], 'streak': coach_output['new_streak']}})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            serialization_time = (time.time() - serialization_start) * 1000
            print(f"  [Stage Complete] Serialization & Emission in {serialization_time:.1f} ms", flush=True)

            # Print timings to console
            total_elapsed = (time.time() - total_start) * 1000

            fe_be_latency = "N/A"
            if req.sentAt is not None:
                fe_be_latency = f"{int((start_received * 1000) - req.sentAt)} ms"

            print("\n================ PIPELINE TIMINGS ================", flush=True)
            print(f"Frontend → Backend: {fe_be_latency}", flush=True)
            print(f"Authentication: 0 ms", flush=True)
            print(f"Database Reads: {db_read_time:.1f} ms", flush=True)
            print(f"Database Writes: {db_write_user_time + db_write_assistant_time:.1f} ms", flush=True)
            print(f"Brain Agent (LLM classification): {brain_time:.1f} ms", flush=True)
            if brain_decision["needs_planning"]:
                print(f"Planner Agent (LLM planning): {planner_time:.1f} ms", flush=True)
            if brain_decision["needs_coaching"]:
                print(f"Coach Agent (LLM coaching): {coach_time:.1f} ms", flush=True)
            print(f"Final Response (LLM generation): {final_time:.1f} ms", flush=True)
            print(f"Response Serialization: {serialization_time:.1f} ms", flush=True)
            print(f"Total Pipeline Time: {total_elapsed:.1f} ms", flush=True)
            print("==================================================\n", flush=True)

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )



# Google Calendar OAuth
@app.get("/auth/google")
async def google_auth(uid: str):
    url = get_auth_url(uid)
    return RedirectResponse(url)

@app.get("/auth/callback")
async def google_callback(code: str, state: str):
    creds = await handle_callback(code, state)
    if creds:
        print("=== GOOGLE OAUTH CALLBACK TOKEN INFO ===")
        print(f"Token: {creds.token}")
        print(f"Refresh Token: {creds.refresh_token}")
        print(f"Expiry: {creds.expiry}")
        print(f"Scopes: {creds.scopes}")
        print("========================================")
    else:
        print("=== GOOGLE OAUTH CALLBACK FAILED (No credentials returned) ===")
    return RedirectResponse(f"{frontend_url}?calendar=connected")

@app.get("/api/tasks/{uid}")
async def get_tasks(uid: str):
    tasks = await get_existing_tasks(uid)
    return {"tasks": tasks}

@app.post("/api/habits/{uid}")
async def log_habit(uid: str, log: dict):
    await save_habit_log(uid, log)
    return {"status": "ok"}

@app.get("/api/score/{uid}")
async def get_score(uid: str):
    return await get_productivity_score(uid)

class SubTask(BaseModel):
    id: str
    title: str
    completed: bool

class TaskUpdate(BaseModel):
    title: str = None
    description: str = None
    startTime: str = None
    endTime: str = None
    duration: int = None
    priority: int = None
    status: str = None
    listId: str = None
    listName: str = None
    pinned: bool = None
    notes: str = None
    dueDate: str = None
    calendarEventId: str = None
    completedAt: str = None
    subtasks: Optional[List[SubTask]] = None

class TaskCreate(BaseModel):
    title: str
    description: str = None
    date: str = None
    dueDate: str = None
    startTime: str = None
    endTime: str = None
    duration: int = 60
    priority: int = 50
    status: str = "pending"
    listId: str = "list-1"
    listName: str = "List 1"
    pinned: bool = False
    notes: str = None
    calendarEventId: str = None
    completedAt: str = None
    subtasks: Optional[List[SubTask]] = None

def validate_datetime(iso_str: str):
    if not iso_str:
        return
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        now = datetime.now(dt.tzinfo)
        # Allow 2 minutes buffer for network/clock differences
        if dt < now - timedelta(minutes=2):
            raise HTTPException(status_code=400, detail="Cannot schedule tasks in the past.")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time format: {e}")

@app.post("/api/tasks/{uid}")
async def create_task_endpoint(uid: str, task: TaskCreate):
    task_dict = task.dict()
    if task_dict.get("startTime"):
        validate_datetime(task_dict["startTime"])
    if task_dict.get("startTime") and not task_dict.get("endTime"):
        try:
            start_dt = datetime.fromisoformat(task_dict["startTime"].replace("Z", ""))
            end_dt = start_dt + timedelta(minutes=task_dict.get("duration", 60))
            task_dict["endTime"] = end_dt.isoformat()
        except Exception:
            pass
            
    # Save to Firestore
    from services.firestore_service import firestore
    tasks_ref = db.collection("tasks")
    doc_ref = tasks_ref.document()
    task_id = doc_ref.id
    task_dict["id"] = task_id
    task_dict["taskId"] = task_id
    task_dict["uid"] = uid
    task_dict["createdAt"] = firestore.SERVER_TIMESTAMP
    task_dict["updatedAt"] = firestore.SERVER_TIMESTAMP
    
    # Add compatibility keys
    task_dict["priority_reasoning"] = task_dict["description"] or "Created manually"
    task_dict["scheduled_start"] = task_dict["startTime"]
    task_dict["scheduled_end"] = task_dict["endTime"]
    task_dict["duration_minutes"] = task_dict["duration"]
    task_dict["priority_score"] = task_dict["priority"]
    task_dict["calendar_event_id"] = task_dict.get("calendarEventId") or ""
    task_dict["color"] = "#6366f1"
    
    doc_ref.set(task_dict)
    
    # Sync to Google Calendar
    if task_dict.get("startTime") and task_dict.get("endTime"):
        await create_calendar_event(uid, task_dict)
        
    # Convert SERVER_TIMESTAMP to string for the API response
    response_task = task_dict.copy()
    current_time_iso = datetime.utcnow().isoformat() + "Z"
    response_task["createdAt"] = current_time_iso
    response_task["updatedAt"] = current_time_iso
    
    return {"status": "ok", "task": response_task}

@app.post("/api/tasks/{uid}/{task_id}/edit")
async def edit_task(uid: str, task_id: str, updates: TaskUpdate):
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if "startTime" in update_data:
        tasks = await get_existing_tasks(uid)
        task_obj = next((t for t in tasks if t["id"] == task_id), None)
        if not task_obj or task_obj.get("startTime") != update_data["startTime"]:
            validate_datetime(update_data["startTime"])
    await update_task_db(uid, task_id, update_data)
    tasks = await get_existing_tasks(uid)
    task_obj = next((t for t in tasks if t["id"] == task_id), None)
    if task_obj:
        await create_calendar_event(uid, task_obj)
    return {"status": "ok"}

@app.post("/api/tasks/{uid}/{task_id}/complete")
async def complete_task_endpoint(uid: str, task_id: str):
    await update_task_db(uid, task_id, {"status": "completed", "completedAt": datetime.utcnow().isoformat()})
    tasks = await get_existing_tasks(uid)
    task_obj = next((t for t in tasks if t["id"] == task_id), None)
    if task_obj:
        await create_calendar_event(uid, task_obj)
    return {"status": "ok"}

@app.post("/api/tasks/{uid}/{task_id}/missed")
async def missed_task_endpoint(uid: str, task_id: str):
    await update_task_db(uid, task_id, {"status": "missed"})
    tasks = await get_existing_tasks(uid)
    task_obj = next((t for t in tasks if t["id"] == task_id), None)
    if task_obj:
        await create_calendar_event(uid, task_obj)
    return {"status": "ok"}

@app.delete("/api/tasks/{uid}/{task_id}")
async def delete_task_endpoint(uid: str, task_id: str):
    tasks = await get_existing_tasks(uid)
    task_obj = next((t for t in tasks if t["id"] == task_id), None)
    if task_obj:
        await delete_task_db(uid, task_id)
        cal_evt_id = task_obj.get("calendar_event_id") or task_obj.get("calendarEventId")
        if cal_evt_id:
            await delete_calendar_event(uid, cal_evt_id)
    return {"status": "ok"}
