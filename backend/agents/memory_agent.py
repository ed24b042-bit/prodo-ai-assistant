import json
from datetime import datetime, timedelta, timezone
from services.gemini_service import call_gemini_json
from services.firestore_service import db

async def run_weekly_memory_cleanup(uid: str):
    try:
        print(f"Running weekly memory cleanup for user: {uid}")
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        
        # 1. Fetch conversation history for the week
        msgs_ref = db.collection("conversations").document(uid).collection("messages")
        msgs_query = msgs_ref.where("createdAt", ">=", seven_days_ago).order_by("createdAt").stream()
        history = []
        for doc in msgs_query:
            d = doc.to_dict()
            history.append({
                "role": d.get("role"),
                "content": d.get("content")
            })
            
        # 2. Fetch tasks created this week
        tasks_ref = db.collection("tasks")
        tasks_query = tasks_ref.where("uid", "==", uid).where("createdAt", ">=", seven_days_ago).stream()
        tasks = []
        for doc in tasks_query:
            d = doc.to_dict()
            tasks.append({
                "title": d.get("title"),
                "status": d.get("status")
            })
            
        # 3. Fetch habit logs this week
        logs_ref = db.collection("habit_logs")
        logs_query = logs_ref.where("uid", "==", uid).where("createdAt", ">=", seven_days_ago).stream()
        logs = []
        for doc in logs_query:
            d = doc.to_dict()
            logs.append({
                "task_id": d.get("task_id"),
                "location": d.get("location"),
                "focus_score": d.get("focus_score")
            })
            
        if not history and not tasks:
            print(f"No sufficient data to extract insights for user {uid}")
            return
            
        # 4. Call Gemini to extract insights
        prompt = f"""You are analyzing a week of conversations for a productivity assistant user.
Extract important insights about this user's preferences, patterns, and commitments.

Conversation history: {history}
Tasks created this week: {tasks}
Habit logs this week: {logs}

Extract 3-8 insights. Each insight should be:
- Specific and actionable (not vague like "user is busy")
- Based on real evidence from the conversations
- Useful for future scheduling and responses

Categories:
- preference: things the user explicitly prefers
- pattern: behavioral patterns you observed
- commitment: recurring events or obligations
- other: anything else important

Return ONLY valid JSON:
{{
  "insights": [
    {{
      "insight": "string (one clear sentence)",
      "category": "preference|pattern|commitment|other",
      "confidence": "high|medium"
    }}
  ]
}}"""

        output = call_gemini_json(prompt)
        insights = output.get("insights", [])
        
        # 5. Save to long_term_memory collection
        memory_ref = db.collection("long_term_memory").document(uid).collection("insights")
        for item in insights:
            memory_ref.add({
                "insight": item.get("insight"),
                "category": item.get("category", "other"),
                "confidence": item.get("confidence", "medium"),
                "createdAt": datetime.now(timezone.utc)
            })
            
        # 6. Delete conversation history older than 7 days
        old_msgs_query = msgs_ref.where("createdAt", "<", seven_days_ago).stream()
        deleted_count = 0
        for doc in old_msgs_query:
            doc.reference.delete()
            deleted_count += 1
            
        print(f"Successfully saved {len(insights)} insights and deleted {deleted_count} old messages.")
    except Exception as e:
        print(f"Error in weekly memory cleanup for {uid}: {e}")
