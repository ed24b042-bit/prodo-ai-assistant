import json
from datetime import datetime
from services.gemini_service import call_gemini_json
from services.firestore_service import db

async def run_coach(
    habit_logs: list[dict],
    productivity_score: int,
    streak_days: int,
    current_datetime: str,
    uid: str = None
) -> dict:
    tasks_completed_today = 0
    tasks_missed_today = 0
    focus_minutes_today = 0
    
    if uid:
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            score_ref = db.collection("productivity_scores").document(uid).collection("daily").document(today_str)
            score_doc = score_ref.get()
            if score_doc.exists:
                score_dict = score_doc.to_dict()
                tasks_completed_today = score_dict.get("tasks_completed", 0)
                tasks_missed_today = score_dict.get("tasks_missed", 0)
                focus_minutes_today = score_dict.get("focus_minutes", 0)
        except Exception as e:
            print(f"Error fetching daily productivity score in coach: {e}")

    # Fallback to local calculations from habit_logs if firestore daily record is empty or not yet created
    if tasks_completed_today == 0 and focus_minutes_today == 0 and habit_logs:
        today_str = datetime.now().strftime("%Y-%m-%d")
        for log in habit_logs:
            created_at_str = log.get("createdAt")
            if not created_at_str:
                continue
            try:
                if isinstance(created_at_str, datetime):
                    dt = created_at_str
                else:
                    clean_str = created_at_str.split(".")[0].replace("Z", "")
                    dt = datetime.fromisoformat(clean_str)
                if dt.strftime("%Y-%m-%d") == today_str:
                    tasks_completed_today += 1
                    focus_minutes_today += log.get("duration_minutes", 60)
            except Exception:
                continue

    habit_log_count = len(habit_logs)

    prompt = f"""You are Prodo's coaching agent. Generate a habit insight and update productivity score.

Current datetime: {current_datetime}
Habit logs (last 30 days): {habit_logs[:15] if habit_logs else []}
Total habit logs count: {habit_log_count}
Current productivity score: {productivity_score}
Current streak days: {streak_days}
Tasks completed today: {tasks_completed_today}
Tasks missed today: {tasks_missed_today}
Focus minutes today: {focus_minutes_today}

Rules:
- If habit_log_count < 5: set insight to exactly:
  "Log a few focus sessions and I'll start learning your patterns 📊"
- If habit_log_count >= 5: analyze the logs and write ONE specific insight
  based on real patterns. Example: "You complete tasks 40% faster before noon."
  NEVER make up patterns. Only state what the data actually shows.

Calculate new productivity score:
  base = (tasks_completed_today / max(tasks_completed_today + tasks_missed_today, 1)) * 60
  focus_bonus = min(focus_minutes_today / 120, 1.0) * 25
  streak_bonus = min(streak_days * 2, 15)
  new_score = round(min(base + focus_bonus + streak_bonus, 100))

Calculate new streak:
  If tasks_completed_today > 0: new_streak = streak_days + 1
  Else: new_streak = 0

Return ONLY valid JSON:
{{
  "insight": "string",
  "new_score": number,
  "new_streak": number,
  "show_insight": true/false
}}"""

    try:
        output = call_gemini_json(prompt)
        
        # Override calculation rules explicitly in python to ensure correctness
        base = (tasks_completed_today / max(tasks_completed_today + tasks_missed_today, 1)) * 60
        focus_bonus = min(focus_minutes_today / 120, 1.0) * 25
        streak_bonus = min(streak_days * 2, 15)
        new_score = round(min(base + focus_bonus + streak_bonus, 100))
        
        if tasks_completed_today > 0:
            new_streak = streak_days + 1
        else:
            new_streak = 0
            
        output["new_score"] = new_score
        output["new_streak"] = new_streak
        
        if habit_log_count < 5:
            output["insight"] = "Log a few focus sessions and I'll start learning your patterns \ud83d\udcca"
            output["show_insight"] = False
        else:
            output["show_insight"] = True
            
        return output
    except Exception as e:
        print(f"Error in run_coach: {e}")
        # Return valid fallback
        return {
            "insight": "Log a few focus sessions and I'll start learning your patterns \ud83d\udcca",
            "new_score": productivity_score,
            "new_streak": streak_days,
            "show_insight": False
        }
