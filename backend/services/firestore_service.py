import os
import json
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Helper to load service account dict
def get_service_account_dict():
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if sa_json.strip().startswith("{"):
        try:
            return json.loads(sa_json)
        except Exception:
            pass
            
    # Parse .env directly in case dotenv multiline parsing failed
    # Look for .env in parent or current dir
    dotenv_paths = [".env", "../.env", "../../.env"]
    for path in dotenv_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                # Find FIREBASE_SERVICE_ACCOUNT_JSON={ ... }
                import re
                match = re.search(r"FIREBASE_SERVICE_ACCOUNT_JSON\s*=\s*(\{.*?\})", content, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
            except Exception as e:
                print(f"Error parsing {path} for credentials: {e}")
                
    return None

# Initialize Firebase
if not firebase_admin._apps:
    sa_dict = get_service_account_dict()
    if sa_dict:
        cred = credentials.Certificate(sa_dict)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()

async def get_conversation_history(uid: str) -> list[dict]:
    try:
        msgs_ref = db.collection("conversations").document(uid).collection("messages")
        docs = msgs_ref.order_by("createdAt", direction=firestore.Query.ASCENDING).limit(20).stream()
        history = []
        for doc in docs:
            d = doc.to_dict()
            history.append({
                "role": d.get("role"),
                "content": d.get("content")
            })
        return history
    except Exception as e:
        print(f"Error get_conversation_history: {e}")
        return []

async def save_message(uid: str, role: str, content: str):
    try:
        msgs_ref = db.collection("conversations").document(uid).collection("messages")
        msgs_ref.add({
            "role": role,
            "content": content,
            "createdAt": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"Error save_message: {e}")

async def get_long_term_memory(uid: str) -> list[str]:
    try:
        mem_ref = db.collection("long_term_memory").document(uid).collection("insights")
        docs = mem_ref.order_by("createdAt", direction=firestore.Query.DESCENDING).stream()
        insights = []
        for doc in docs:
            insights.append(doc.to_dict().get("insight", ""))
        return insights
    except Exception as e:
        print(f"Error get_long_term_memory: {e}")
        return []

async def get_existing_tasks(uid: str) -> list[dict]:
    try:
        tasks_ref = db.collection("tasks")
        docs = tasks_ref.where("uid", "==", uid).stream()
        tasks = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if "createdAt" in d and d["createdAt"]:
                try:
                    d["createdAt"] = d["createdAt"].isoformat()
                except AttributeError:
                    pass
            if "completedAt" in d and d["completedAt"]:
                try:
                    d["completedAt"] = d["completedAt"].isoformat()
                except AttributeError:
                    pass
            tasks.append(d)
        return tasks
    except Exception as e:
        print(f"Error get_existing_tasks: {e}")
        return []

async def get_habit_logs(uid: str) -> list[dict]:
    try:
        logs_ref = db.collection("habit_logs")
        docs = logs_ref.where("uid", "==", uid).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(50).stream()
        logs = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if "createdAt" in d and d["createdAt"]:
                try:
                    d["createdAt"] = d["createdAt"].isoformat()
                except AttributeError:
                    pass
            logs.append(d)
        return logs
    except Exception as e:
        print(f"Error get_habit_logs: {e}")
        return []

async def get_productivity_score(uid: str) -> dict:
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        score_ref = db.collection("productivity_scores").document(uid).collection("daily").document(today_str)
        doc = score_ref.get()
        if doc.exists:
            d = doc.to_dict()
            return d
        else:
            daily_ref = db.collection("productivity_scores").document(uid).collection("daily")
            prev_docs = daily_ref.order_by("date", direction=firestore.Query.DESCENDING).limit(1).stream()
            prev_streak = 0
            prev_score = 0
            for p_doc in prev_docs:
                p_d = p_doc.to_dict()
                prev_streak = p_d.get("streak_days", 0)
                prev_score = p_d.get("score", 0)
            
            return {
                "date": today_str,
                "score": prev_score,
                "streak_days": prev_streak,
                "tasks_completed": 0,
                "tasks_missed": 0,
                "focus_minutes": 0
            }
    except Exception as e:
        print(f"Error get_productivity_score: {e}")
        return {"score": 0, "streak_days": 0, "tasks_completed": 0, "tasks_missed": 0, "focus_minutes": 0}

async def save_tasks(uid: str, tasks: list[dict]):
    try:
        tasks_ref = db.collection("tasks")
        for task in tasks:
            task_id = task.get("id") or task.get("taskId")
            
            task_data = {
                "uid": uid,
                "title": task.get("title", ""),
                "description": task.get("description", task.get("priority_reasoning", "Scheduled by Prodo")),
                "dueDate": task.get("dueDate", task.get("date", "")),
                "startTime": task.get("startTime", task.get("scheduled_start", "")),
                "endTime": task.get("endTime", task.get("scheduled_end", "")),
                "duration": task.get("duration", task.get("duration_minutes", 60)),
                "priority": task.get("priority", task.get("priority_score", 50)),
                "status": task.get("status", "pending"),
                "listId": task.get("listId", "list-1"),
                "listName": task.get("listName", "List 1"),
                "calendarEventId": task.get("calendarEventId", task.get("calendar_event_id", "")),
                "updatedAt": firestore.SERVER_TIMESTAMP,
                
                # Compatibility keys
                "priority_reasoning": task.get("description", task.get("priority_reasoning", "Scheduled by Prodo")),
                "scheduled_start": task.get("startTime", task.get("scheduled_start", "")),
                "scheduled_end": task.get("endTime", task.get("scheduled_end", "")),
                "duration_minutes": task.get("duration", task.get("duration_minutes", 60)),
                "priority_score": task.get("priority", task.get("priority_score", 50)),
                "calendar_event_id": task.get("calendarEventId", task.get("calendar_event_id", "")),
                "color": task.get("color", "#6366f1")
            }

            if task_id:
                task_data["taskId"] = task_id
                doc_ref = tasks_ref.document(task_id)
                doc_ref.update(task_data)
            else:
                doc_ref = tasks_ref.document()
                new_id = doc_ref.id
                task_data["id"] = new_id
                task_data["taskId"] = new_id
                task_data["createdAt"] = firestore.SERVER_TIMESTAMP
                doc_ref.set(task_data)
                task["id"] = new_id
                task["taskId"] = new_id
                task["calendar_event_id"] = task_data["calendar_event_id"]
                task["calendarEventId"] = task_data["calendarEventId"]
    except Exception as e:
        print(f"Error save_tasks: {e}")

async def get_conversation_state(uid: str) -> dict:
    try:
        doc_ref = db.collection("conversations").document(uid)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict().get("state", {})
        return {}
    except Exception as e:
        print(f"Error get_conversation_state: {e}")
        return {}

async def save_conversation_state(uid: str, state: dict):
    try:
        doc_ref = db.collection("conversations").document(uid)
        if doc_ref.get().exists:
            doc_ref.update({"state": state})
        else:
            doc_ref.set({"state": state})
    except Exception as e:
        print(f"Error save_conversation_state: {e}")

async def delete_task_db(uid: str, task_id: str):
    try:
        db.collection("tasks").document(task_id).delete()
    except Exception as e:
        print(f"Error delete_task_db: {e}")

async def update_task_db(uid: str, task_id: str, updates: dict):
    try:
        task_ref = db.collection("tasks").document(task_id)
        updates["updatedAt"] = firestore.SERVER_TIMESTAMP
        # Map both styles
        if "description" in updates:
            updates["priority_reasoning"] = updates["description"]
        if "startTime" in updates:
            updates["scheduled_start"] = updates["startTime"]
        if "endTime" in updates:
            updates["scheduled_end"] = updates["endTime"]
        if "duration" in updates:
            updates["duration_minutes"] = updates["duration"]
        if "priority" in updates:
            updates["priority_score"] = updates["priority"]
        if "calendarEventId" in updates:
            updates["calendar_event_id"] = updates["calendarEventId"]
        if "dueDate" in updates:
            updates["date"] = updates["dueDate"]
        task_ref.update(updates)
    except Exception as e:
        print(f"Error update_task_db: {e}")

async def update_productivity_score(uid: str, new_score: int, new_streak: int):
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        score_ref = db.collection("productivity_scores").document(uid).collection("daily").document(today_str)
        doc = score_ref.get()
        if doc.exists:
            score_ref.update({
                "score": new_score,
                "streak_days": new_streak
            })
        else:
            score_ref.set({
                "date": today_str,
                "score": new_score,
                "streak_days": new_streak,
                "tasks_completed": 0,
                "tasks_missed": 0,
                "focus_minutes": 0
            })
    except Exception as e:
        print(f"Error update_productivity_score: {e}")

async def save_habit_log(uid: str, log: dict):
    try:
        logs_ref = db.collection("habit_logs")
        logs_ref.add({
            "uid": uid,
            "task_id": log.get("task_title", ""),
            "location": log.get("location", "home"),
            "focus_score": int(log.get("focus_score", 7)),
            "distractions": int(log.get("distractions", 0)),
            "duration_minutes": int(log.get("duration_minutes", 60)),
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        
        # Mark the task as completed
        tasks_ref = db.collection("tasks")
        query = tasks_ref.where("uid", "==", uid).where("title", "==", log.get("task_title", "")).where("status", "==", "pending").stream()
        for doc in query:
            doc.reference.update({
                "status": "completed",
                "completedAt": firestore.SERVER_TIMESTAMP
            })
        
        # Update daily stats
        today_str = datetime.now().strftime("%Y-%m-%d")
        score_ref = db.collection("productivity_scores").document(uid).collection("daily").document(today_str)
        doc = score_ref.get()
        focus_mins = int(log.get("duration_minutes", 60))
        if doc.exists:
            score_ref.update({
                "tasks_completed": firestore.Increment(1),
                "focus_minutes": firestore.Increment(focus_mins)
            })
        else:
            daily_ref = db.collection("productivity_scores").document(uid).collection("daily")
            prev_docs = daily_ref.order_by("date", direction=firestore.Query.DESCENDING).limit(1).stream()
            prev_streak = 0
            prev_score = 0
            for p_doc in prev_docs:
                p_d = p_doc.to_dict()
                prev_streak = p_d.get("streak_days", 0)
                prev_score = p_d.get("score", 0)
            
            score_ref.set({
                "date": today_str,
                "score": prev_score,
                "streak_days": prev_streak,
                "tasks_completed": 1,
                "tasks_missed": 0,
                "focus_minutes": focus_mins
            })
    except Exception as e:
        print(f"Error save_habit_log: {e}")
