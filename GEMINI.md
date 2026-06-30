# PRODO — MASTER BUILD PROMPT
# Paste this as GEMINI.md in your project root.
# Read this fully before writing a single line of code.

---

## YOUR ROLE

You are a senior full-stack engineer building PRODO — a conversational AI productivity
assistant for a Google AI hackathon. You write complete, working code. No TODOs, no
placeholders, no mocks. Every file you create must be immediately runnable.

You never ask clarifying questions — every decision is already made in this document.
When in doubt, pick the simpler working solution.

---

## WHAT PRODO IS

Prodo is an AI executive assistant that feels like texting a smart friend who happens
to be extremely organized. You talk to it naturally. It listens, thinks, and helps you
get things done — extracting tasks, scheduling them intelligently, learning your habits,
and getting smarter about you every week.

### The experience
User types: "I have a presentation Friday, need to prep slides and do a dry run"
Prodo responds in chat:
  ⚡ Prodo is listening...
  ⚡ Prodo is planning...
  ⚡ Prodo is coaching...
  [final friendly response with tasks scheduled]

That's it. No dashboards to configure. No rigid forms. Just conversation.

---

## PERSONALITY — NON-NEGOTIABLE

- Warm + direct. Friendly but never wastes the user's time.
- Never says "Great question!", "Certainly!", "Of course!", or any filler phrase.
- Always references actual task names and times — never generic.
- Feels like a smart friend who happens to be very organized.
- When it doesn't know something, it asks. When it does, it just does it.

---

## CONFIRMED FEATURES

1. Natural language task input
2. LLM extracts tasks + deadlines + durations
3. LLM detects if user mentioned a preferred time
4. LLM prioritizes tasks by urgency + importance with reasoning
5. LLM schedules tasks — checks existing tasks for conflicts first
6. LLM generates friendly conversational response
7. Agent thinking shows in chat ("⚡ Prodo is planning...")
8. Voice input — speech to text only
9. Habit logging — location + focus score + distractions
10. AI learns peak hours from habit logs (only after 5+ logs)
11. Productivity score 0-100 updated daily
12. Streak counter — consecutive productive days
13. Google Calendar sync — read events + create task events
14. Dark glassmorphic premium UI
15. Drag and drop task reordering
16. Short term memory — 7 days conversation history
17. Long term memory — LLM extracts insights weekly, silently
18. Weekly auto-cleanup of conversation history

---

## SCHEDULING RULES — CRITICAL

Priority 1 — User stated a specific time → just do it, mention casually:
  "Got it, prepping slides is locked in for tonight at 8pm."
  NEVER ask "does that work?" — they already told you.

Priority 2 — No time stated → LLM checks existing tasks for conflicts →
  proposes a free slot → asks ONCE:
  "You're free at 6pm tonight — want me to schedule prep slides then?"
  If busy: "You've got something at 6pm. How about 8pm instead?"

Priority 3 — User wants to change → renegotiate naturally:
  "No problem, what time works better?"

Core rule: only ask when you genuinely don't know.
Never confirm what the user already told you.

---

## MEMORY ARCHITECTURE

### Short Term (7 days)
Full conversation history. All agents read it every request.
Deleted after 7 days.

### Long Term (permanent)
Insights extracted from conversations + tasks + habits.
Examples:
- "Prefers evenings for deep work"
- "Has recurring Monday 10am class"  
- "Gets overwhelmed with 3+ deadlines"
- "Works best at library"
- "Usually underestimates task duration"

### Weekly Cleanup (fully automatic, user never sees this)
1. LLM reads 7-day conversation history
2. Extracts important insights → saves to long_term_memory collection
3. Deletes raw conversation history
4. Prodo just gets smarter. No notification to user.

### What every agent receives on every request
- current_datetime (ISO string)
- conversation_history (last 7 days, last 20 messages max)
- long_term_memory (all insights as a list)
- existing_tasks (all scheduled tasks with times)
- habit_logs (last 30 days)
- productivity_score + streak_days

---

## AGENT ARCHITECTURE — NOT RIGID

### Core principle
Agents use their brain. No fixed pipeline. Brain decides who runs.
Simple message → Brain handles alone.
Complex message → Brain calls Planner and/or Coach.
Agents skip entirely if not needed.

### The Brain (always runs first)
- Reads everything: message + full memory + tasks + habits
- Decides what's needed
- For simple replies (thanks, mark done, quick question): handles directly, calls nobody
- For scheduling/priority needs: calls Planner
- For habit/score/streak needs: calls Coach
- Combines outputs into one final response
- Updates conversation history in Firestore

### The Planner (called only when scheduling needed)
- Receives: all existing tasks + current datetime + habit insights + long term memory
- Checks for time conflicts before proposing
- Follows scheduling priority rules above
- Returns: scheduled tasks with datetime slots + reasoning

### The Coach (called only when habits/score relevant)
- Has 5-log rule: only surfaces habit insights if 5+ habit logs exist
- If < 5 logs: "Log a few focus sessions and I'll start learning your patterns 📊"
- If 5+ logs: uses real data only ("You focus best before noon — scheduled hard stuff early")
- Always silently updates productivity score + streak regardless
- Returns: insight string + updated score + streak

### Memory Agent (runs weekly, not per-request)
- Triggered by a scheduled job every 7 days
- Reads full conversation history for this user
- Calls Gemini to extract insights
- Saves to long_term_memory collection
- Deletes conversation history older than 7 days

---

## TECH STACK — NO SUBSTITUTIONS

### Backend
- Python 3.11
- FastAPI + uvicorn
- LangGraph for agent orchestration
- google-generativeai for all Gemini calls (NOT langchain-google-genai)
- Gemini model: gemini-1.5-flash for all agents
- google-api-python-client for Google Calendar
- firebase-admin for Firestore
- python-dotenv for env vars
- APScheduler for weekly memory cleanup job

### Frontend
- Next.js 14 App Router, TypeScript strict mode
- Tailwind CSS
- Framer Motion for all animations
- react-speech-recognition for voice input
- @hello-pangea/dnd for drag and drop (maintained fork of react-beautiful-dnd)
- Firebase SDK v10 for auth + real-time listeners
- Recharts for productivity score chart + habit charts
- Native fetch + ReadableStream for SSE

---

## ENVIRONMENT VARIABLES

Create this .env file in the project root:

```
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_CLIENT_ID=your_calendar_oauth_client_id
GOOGLE_CLIENT_SECRET=your_calendar_oauth_client_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_JSON=paste_entire_json_file_contents_here
NEXT_PUBLIC_FIREBASE_API_KEY=from_firebase_frontend_config
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=from_firebase_frontend_config
NEXT_PUBLIC_FIREBASE_PROJECT_ID=from_firebase_frontend_config
NEXT_PUBLIC_FIREBASE_APP_ID=from_firebase_frontend_config
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Load in every backend file:
```python
from dotenv import load_dotenv
import os
load_dotenv()
```

---

## FIRESTORE COLLECTIONS

### users/{uid}
```
displayName: string
email: string
calendarAccessToken: string
calendarRefreshToken: string
timezone: string
createdAt: timestamp
```

### tasks/{taskId}
```
uid: string
title: string
deadline: string (ISO8601)
duration_minutes: number
priority_score: number (0-100)
status: "pending" | "completed" | "missed"
scheduled_start: string (ISO8601)
scheduled_end: string (ISO8601)
calendar_event_id: string
color: string (hex)
createdAt: timestamp
completedAt: timestamp | null
```

### habit_logs/{logId}
```
uid: string
task_id: string
location: "home" | "library" | "classroom" | "other"
focus_score: number (1-10)
distractions: number (0-5)
duration_minutes: number
createdAt: timestamp
```

### productivity_scores/{uid}/daily/{YYYY-MM-DD}
```
date: string
score: number (0-100)
streak_days: number
tasks_completed: number
tasks_missed: number
focus_minutes: number
```

### conversations/{uid}/messages/{messageId}
```
role: "user" | "assistant"
content: string
createdAt: timestamp
```

### long_term_memory/{uid}/insights/{insightId}
```
insight: string
category: "preference" | "pattern" | "commitment" | "other"
confidence: "high" | "medium"
createdAt: timestamp
```

---

## FILE STRUCTURE — CREATE ALL OF THESE

```
prodo/
├── GEMINI.md                          ← this file
├── .env                               ← all API keys
│
├── backend/
│   ├── main.py                        ← FastAPI app + all endpoints
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── state.py                   ← AgentState TypedDict
│   │   ├── brain.py                   ← orchestrator agent
│   │   ├── planner.py                 ← scheduling agent
│   │   ├── coach.py                   ← habits + score agent
│   │   └── memory_agent.py            ← weekly insight extractor
│   ├── services/
│   │   ├── __init__.py
│   │   ├── firestore_service.py       ← all DB operations
│   │   ├── calendar_service.py        ← Google Calendar integration
│   │   └── gemini_service.py          ← shared Gemini client
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                   ← main chat interface
    │   ├── globals.css
    │   └── analytics/
    │       └── page.tsx               ← habit charts + score
    ├── components/
    │   ├── ChatInterface.tsx           ← main chat + thinking indicators
    │   ├── TaskPanel.tsx              ← draggable task list
    │   ├── HabitLogger.tsx            ← log focus session
    │   ├── ProductivityCard.tsx       ← score + streak display
    │   └── VoiceInput.tsx             ← speech to text button
    ├── lib/
    │   ├── firebase.ts
    │   ├── useStream.ts               ← SSE hook
    │   └── types.ts
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── next.config.mjs
```

---

## BACKEND IMPLEMENTATION

### backend/services/gemini_service.py
```python
import google.generativeai as genai
import os, json
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

def call_gemini(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text.strip()

def call_gemini_json(prompt: str) -> dict:
    response = model.generate_content(prompt)
    text = response.text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip().rstrip("```")
    return json.loads(text.strip())
```

---

### backend/agents/state.py
```python
from typing import TypedDict, Optional

class AgentState(TypedDict):
    # Input
    user_message: str
    uid: str
    session_id: str
    current_datetime: str
    
    # Context loaded before agents run
    conversation_history: list[dict]
    long_term_memory: list[str]
    existing_tasks: list[dict]
    habit_logs: list[dict]
    productivity_score: int
    streak_days: int
    
    # Agent decisions
    needs_planning: bool
    needs_coaching: bool
    planner_output: Optional[dict]
    coach_output: Optional[dict]
    
    # Final output
    thinking_steps: list[str]
    final_response: str
    scheduled_tasks: list[dict]
```

---

### backend/agents/brain.py

The Brain does three things:
1. Decides if Planner and/or Coach are needed
2. If yes, calls them and combines output
3. Generates the final response

GEMINI PROMPT FOR DECISION:
```
You are Prodo, an AI executive assistant. Analyze this message and decide what's needed.

User message: "{user_message}"
Current datetime: {current_datetime}
Conversation history (last 10 messages): {conversation_history}
Long term memory about this user: {long_term_memory}
Existing scheduled tasks: {existing_tasks}

Decide:
1. Does this need scheduling or task management? (needs_planning: true/false)
2. Does this need habit/productivity insights? (needs_coaching: true/false)
3. What is a brief thinking label to show the user while processing?
   Examples: "listening", "planning your week", "checking your schedule", "thinking"

Return ONLY valid JSON:
{{
  "needs_planning": true/false,
  "needs_coaching": true/false,
  "thinking_label": "short phrase"
}}
```

GEMINI PROMPT FOR FINAL RESPONSE:
```
You are Prodo, an AI executive assistant. Generate the final response.

Personality: warm and direct, never wastes time, always specific, never generic.
Never say "Great!", "Certainly!", "Of course!" or any filler.
Always mention actual task names and scheduled times.

User message: "{user_message}"
Current datetime: {current_datetime}
Conversation history: {conversation_history}
Long term memory: {long_term_memory}
Planner output: {planner_output}
Coach output: {coach_output}

Write a natural conversational response (2-4 sentences max).
If tasks were scheduled: mention the specific task names and times.
If you asked for more info: ask exactly one clear question.
If simple acknowledgment needed: keep it under 2 sentences.
Return ONLY the response text. No JSON. No formatting.
```

---

### backend/agents/planner.py

GEMINI PROMPT:
```
You are Prodo's planning agent. Your job: figure out when to schedule tasks.

Current datetime: {current_datetime}
User message: "{user_message}"
Existing scheduled tasks (check these for conflicts): {existing_tasks}
User's long term memory (preferences, patterns): {long_term_memory}
Habit data (peak hours): {habit_summary}

Instructions:
1. Extract all tasks from the user message with deadlines and estimated durations
2. For each task, determine the scheduled time using this priority:
   a. If user mentioned a specific time → use it exactly, no confirmation needed
   b. If user mentioned vague time (tonight, morning, after lunch) → interpret it:
      "tonight" = 7pm today
      "morning" = 9am (today if before 9am, tomorrow if after)
      "afternoon" = 2pm
      "after lunch" = 1pm
   c. If no time mentioned → check existing_tasks for free slots →
      propose the earliest free slot that matches habit peak hours if available
      → set needs_user_confirmation: true
3. Check ALL existing tasks for conflicts before assigning any slot
4. If a conflict exists, find the next free slot automatically

Return ONLY valid JSON:
{{
  "tasks": [
    {{
      "title": "string",
      "deadline": "ISO8601 or null",
      "duration_minutes": 60,
      "scheduled_start": "ISO8601",
      "scheduled_end": "ISO8601",
      "priority_score": 0-100,
      "priority_reasoning": "one sentence why this priority",
      "needs_user_confirmation": true/false,
      "confirmation_question": "question to ask user if needs_user_confirmation is true",
      "color": "#ef4444 for high priority, #6366f1 for medium, #22c55e for low"
    }}
  ]
}}
```

---

### backend/agents/coach.py

GEMINI PROMPT:
```
You are Prodo's coaching agent. Generate a habit insight and update productivity score.

Current datetime: {current_datetime}
Habit logs (last 30 days): {habit_logs}
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
}}
```

---

### backend/agents/memory_agent.py

GEMINI PROMPT FOR INSIGHT EXTRACTION:
```
You are analyzing a week of conversations for a productivity assistant user.
Extract important insights about this user's preferences, patterns, and commitments.

Conversation history: {conversation_history}
Tasks created this week: {tasks_this_week}
Habit logs this week: {habit_logs_this_week}

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
}}
```

---

### backend/main.py — SSE ENDPOINT

CRITICAL SSE RULES:
- Each thinking step emits immediately as it happens
- No buffering — emit as you go
- thinking steps: "listening", "planning", "coaching" shown in UI
- Each event emitted exactly once — no duplicates
- Final event is always {"type": "done"}

```python
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel
import json, uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

from agents.brain import run_brain
from agents.planner import run_planner
from agents.coach import run_coach
from services.firestore_service import (
    get_conversation_history, save_message,
    get_long_term_memory, get_existing_tasks,
    get_habit_logs, get_productivity_score,
    save_tasks, update_productivity_score
)
from services.calendar_service import get_auth_url, handle_callback, create_calendar_event

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    uid: str

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    async def generate():
        try:
            # Load all context
            history = await get_conversation_history(req.uid)
            memory = await get_long_term_memory(req.uid)
            tasks = await get_existing_tasks(req.uid)
            logs = await get_habit_logs(req.uid)
            score_data = await get_productivity_score(req.uid)

            # Save user message
            await save_message(req.uid, "user", req.message)

            # Step 1: Brain decides
            yield f"data: {json.dumps({'type': 'thinking', 'label': 'listening'})}\n\n"
            
            brain_decision = await run_brain(
                user_message=req.message,
                current_datetime=datetime.now().isoformat(),
                conversation_history=history,
                long_term_memory=memory,
                existing_tasks=tasks
            )

            planner_output = None
            coach_output = None

            # Step 2: Planner if needed
            if brain_decision["needs_planning"]:
                yield f"data: {json.dumps({'type': 'thinking', 'label': 'planning'})}\n\n"
                planner_output = await run_planner(
                    user_message=req.message,
                    current_datetime=datetime.now().isoformat(),
                    existing_tasks=tasks,
                    long_term_memory=memory,
                    habit_logs=logs
                )
                # Save tasks to Firestore + Google Calendar
                if planner_output and planner_output.get("tasks"):
                    await save_tasks(req.uid, planner_output["tasks"])
                    for task in planner_output["tasks"]:
                        if not task.get("needs_user_confirmation"):
                            await create_calendar_event(req.uid, task)

            # Step 3: Coach if needed
            if brain_decision["needs_coaching"]:
                yield f"data: {json.dumps({'type': 'thinking', 'label': 'coaching'})}\n\n"
                coach_output = await run_coach(
                    habit_logs=logs,
                    productivity_score=score_data.get("score", 0),
                    streak_days=score_data.get("streak_days", 0),
                    current_datetime=datetime.now().isoformat()
                )
                if coach_output:
                    await update_productivity_score(
                        req.uid,
                        coach_output["new_score"],
                        coach_output["new_streak"]
                    )

            # Step 4: Final response
            yield f"data: {json.dumps({'type': 'thinking', 'label': 'responding'})}\n\n"
            
            from agents.brain import generate_final_response
            final_response = await generate_final_response(
                user_message=req.message,
                current_datetime=datetime.now().isoformat(),
                conversation_history=history,
                long_term_memory=memory,
                planner_output=planner_output,
                coach_output=coach_output
            )

            # Save assistant response
            await save_message(req.uid, "assistant", final_response)

            # Emit final response
            yield f"data: {json.dumps({'type': 'response', 'payload': final_response})}\n\n"
            
            # Emit updated tasks if any
            if planner_output and planner_output.get("tasks"):
                yield f"data: {json.dumps({'type': 'tasks_updated', 'payload': planner_output['tasks']})}\n\n"

            # Emit score update if any
            if coach_output:
                yield f"data: {json.dumps({'type': 'score_updated', 'payload': {'score': coach_output['new_score'], 'streak': coach_output['new_streak']}})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

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
    await handle_callback(code, state)
    return RedirectResponse("http://localhost:3000?calendar=connected")

@app.get("/api/tasks/{uid}")
async def get_tasks(uid: str):
    tasks = await get_existing_tasks(uid)
    return {"tasks": tasks}

@app.post("/api/habits/{uid}")
async def log_habit(uid: str, log: dict):
    from services.firestore_service import save_habit_log
    await save_habit_log(uid, log)
    return {"status": "ok"}

@app.get("/api/score/{uid}")
async def get_score(uid: str):
    return await get_productivity_score(uid)
```

---

### requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
langgraph==0.1.5
google-generativeai==0.5.4
google-api-python-client==2.126.0
google-auth==2.29.0
google-auth-oauthlib==1.2.0
firebase-admin==6.5.0
python-dotenv==1.0.1
pydantic==2.7.1
apscheduler==3.10.4
httpx==0.27.0
```

---

### Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## FRONTEND IMPLEMENTATION

### Design system — use these exact values everywhere

```
Background:        #0a0a0f
Surface:           rgba(255,255,255,0.04)
Surface hover:     rgba(255,255,255,0.07)
Border:            rgba(255,255,255,0.08)
Border hover:      rgba(255,255,255,0.15)
Backdrop blur:     blur(12px)

Primary:           #6366f1  (indigo)
Primary glow:      rgba(99,102,241,0.3)
Success:           #22c55e  (green)
Warning:           #f59e0b  (amber)
Danger:            #ef4444  (red)

Text primary:      #f1f5f9
Text secondary:    #94a3b8
Text muted:        #475569

Font UI:           system-ui, -apple-system, sans-serif
Font mono:         ui-monospace, 'Cascadia Code', monospace
```

### globals.css
```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0a0f;
  color: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
  height: 100vh;
  overflow: hidden;
}

::selection { background: rgba(99,102,241,0.3); }

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

input, textarea {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #f1f5f9;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

input:focus, textarea:focus {
  border-color: rgba(99,102,241,0.5);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

button { cursor: pointer; font-family: inherit; }
```

---

### frontend/lib/useStream.ts
```typescript
import { useState, useCallback } from "react"

export type ThinkingStep = "listening" | "planning" | "coaching" | "responding"

export interface Task {
  title: string
  deadline: string | null
  duration_minutes: number
  scheduled_start: string
  scheduled_end: string
  priority_score: number
  color: string
  needs_user_confirmation: boolean
  confirmation_question?: string
  status: "pending" | "completed" | "missed"
}

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ScoreUpdate {
  score: number
  streak: number
}

export function useStream(uid: string) {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hey! I'm Prodo, your AI executive assistant. What's on your plate today?",
    timestamp: Date.now()
  }])
  const [thinking, setThinking] = useState<ThinkingStep | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [score, setScore] = useState<ScoreUpdate>({ score: 0, streak: 0 })
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true)
    setThinking("listening")
    setMessages(prev => [...prev, {
      role: "user",
      content: message,
      timestamp: Date.now()
    }])

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, uid }),
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event = JSON.parse(data)
            
            if (event.type === "thinking") {
              setThinking(event.label as ThinkingStep)
            }
            if (event.type === "response") {
              setThinking(null)
              setMessages(prev => [...prev, {
                role: "assistant",
                content: event.payload,
                timestamp: Date.now()
              }])
            }
            if (event.type === "tasks_updated") {
              setTasks(event.payload)
            }
            if (event.type === "score_updated") {
              setScore(event.payload)
            }
            if (event.type === "error") {
              setThinking(null)
              setMessages(prev => [...prev, {
                role: "assistant",
                content: "Something went wrong. Try again?",
                timestamp: Date.now()
              }])
            }
            if (event.type === "done") {
              setThinking(null)
              setLoading(false)
            }
          } catch (e) { /* skip malformed */ }
        }
      }
    } catch {
      setThinking(null)
      setLoading(false)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Can't reach the backend. Is it running on port 8000?",
        timestamp: Date.now()
      }])
    }
  }, [uid])

  return { messages, thinking, tasks, score, loading, sendMessage, setTasks }
}
```

---

### frontend/app/page.tsx — MAIN LAYOUT

Two column layout:
- Left (300px): Task panel + Productivity card
- Right (flex-1): Chat interface

```typescript
"use client"
import { useState } from "react"
import { useStream } from "@/lib/useStream"
import { ChatInterface } from "@/components/ChatInterface"
import { TaskPanel } from "@/components/TaskPanel"
import { ProductivityCard } from "@/components/ProductivityCard"

// For hackathon: use a fixed uid. Replace with real auth later.
const UID = "demo-user-001"

export default function Home() {
  const { messages, thinking, tasks, score, loading, sendMessage, setTasks } = useStream(UID)

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#0a0a0f",
    }}>
      {/* Left Panel */}
      <div style={{
        width: 300,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden"
      }}>
        <ProductivityCard score={score.score} streak={score.streak} />
        <TaskPanel tasks={tasks} setTasks={setTasks} uid={UID} />
      </div>

      {/* Right: Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ChatInterface
          messages={messages}
          thinking={thinking}
          loading={loading}
          onSend={sendMessage}
          uid={UID}
        />
      </div>
    </div>
  )
}
```

---

### frontend/components/ChatInterface.tsx

THINKING INDICATOR — shows inside chat like WhatsApp typing:
- Shows "⚡ Prodo is [label]..." with animated dots
- Label changes as each agent runs: listening → planning → coaching → responding
- Fades out when final response arrives
- Agent names NEVER shown — always "Prodo"

```typescript
"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Message, ThinkingStep } from "@/lib/useStream"
import { VoiceInput } from "./VoiceInput"

const THINKING_LABELS: Record<string, string> = {
  listening: "listening...",
  planning: "planning your schedule...",
  coaching: "checking your patterns...",
  responding: "almost there...",
}

export function ChatInterface({
  messages, thinking, loading, onSend, uid
}: {
  messages: Message[]
  thinking: ThinkingStep | null
  loading: boolean
  onSend: (msg: string) => void
  uid: string
}) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <div style={{
          width: 32, height: 32,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Prodo</div>
          <div style={{ fontSize: 11, color: "#475569" }}>AI Executive Assistant</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: loading ? "#f59e0b" : "#22c55e",
            boxShadow: loading ? "0 0 6px #f59e0b" : "0 0 6px #22c55e"
          }} />
          <span style={{ fontSize: 11, color: "#475569" }}>
            {loading ? "thinking" : "online"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 12
      }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div style={{
                maxWidth: "72%",
                padding: "12px 16px",
                borderRadius: msg.role === "user"
                  ? "20px 20px 4px 20px"
                  : "20px 20px 20px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "rgba(255,255,255,0.05)",
                border: msg.role === "user"
                  ? "none"
                  : "1px solid rgba(255,255,255,0.08)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#f1f5f9",
                backdropFilter: "blur(12px)",
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator — shows in chat like WhatsApp typing */}
        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <div style={{
                padding: "10px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px 20px 20px 4px",
                display: "flex", alignItems: "center", gap: 8,
                backdropFilter: "blur(12px)"
              }}>
                <span style={{ fontSize: 13, color: "#6366f1" }}>⚡</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>
                  Prodo is {THINKING_LABELS[thinking] || "thinking..."}
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0,1,2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                      style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: "#6366f1"
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: 10, alignItems: "flex-end"
      }}>
        <VoiceInput onTranscript={setInput} disabled={loading} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="What's on your plate..."
          disabled={loading}
          style={{
            flex: 1, padding: "13px 16px",
            fontSize: 14, borderRadius: 14
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim()
              ? "rgba(99,102,241,0.2)"
              : "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none", borderRadius: 14,
            padding: "13px 20px",
            color: loading || !input.trim() ? "#475569" : "white",
            fontSize: 14, fontWeight: 600,
            transition: "all 0.2s"
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

---

### frontend/components/TaskPanel.tsx

Draggable task list using @hello-pangea/dnd.
Each task card shows: title, scheduled time, priority color bar, status.
Click task to mark complete or missed.
On complete: show HabitLogger inline below that task.

```typescript
"use client"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { motion, AnimatePresence } from "framer-motion"
import { Task } from "@/lib/useStream"
import { useState } from "react"
import { HabitLogger } from "./HabitLogger"

export function TaskPanel({
  tasks, setTasks, uid
}: {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  uid: string
}) {
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null)

  const onDragEnd = (result: any) => {
    if (!result.destination) return
    const items = Array.from(tasks)
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)
    setTasks(items)
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#475569",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 12, padding: "0 4px"
      }}>
        Scheduled Tasks · {tasks.filter(t => t.status === "pending").length}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasks">
          {provided => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <Draggable key={task.title} draggableId={task.title} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{
                            background: snapshot.isDragging
                              ? "rgba(99,102,241,0.1)"
                              : "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderLeft: `3px solid ${task.color}`,
                            borderRadius: 10,
                            padding: "11px 13px",
                            marginBottom: 8,
                            cursor: "grab"
                          }}
                        >
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            color: task.status === "completed" ? "#475569" : "#f1f5f9",
                            textDecoration: task.status === "completed" ? "line-through" : "none",
                            marginBottom: 4
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: 11, color: "#475569" }}>
                            {formatTime(task.scheduled_start)} → {formatTime(task.scheduled_end)}
                          </div>
                          {task.needs_user_confirmation && (
                            <div style={{
                              marginTop: 6, fontSize: 11,
                              color: "#f59e0b",
                              background: "rgba(245,158,11,0.1)",
                              padding: "4px 8px", borderRadius: 6
                            }}>
                              ⏳ Awaiting your confirmation
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            {task.status === "pending" && (
                              <>
                                <button
                                  onClick={() => setLoggingTaskId(task.title)}
                                  style={{
                                    background: "rgba(34,197,94,0.1)",
                                    border: "1px solid rgba(34,197,94,0.2)",
                                    color: "#22c55e", borderRadius: 6,
                                    padding: "3px 8px", fontSize: 11, fontWeight: 600
                                  }}
                                >Done</button>
                                <button
                                  style={{
                                    background: "rgba(239,68,68,0.1)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    color: "#ef4444", borderRadius: 6,
                                    padding: "3px 8px", fontSize: 11, fontWeight: 600
                                  }}
                                >Missed</button>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {loggingTaskId === task.title && (
                          <HabitLogger
                            taskTitle={task.title}
                            uid={uid}
                            onClose={() => setLoggingTaskId(null)}
                          />
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {tasks.length === 0 && (
        <div style={{
          textAlign: "center", color: "#334155",
          fontSize: 12, marginTop: 40, lineHeight: 1.8
        }}>
          No tasks scheduled yet.<br />Tell Prodo what you need to get done.
        </div>
      )}
    </div>
  )
}
```

---

### frontend/components/ProductivityCard.tsx
```typescript
"use client"
import { motion } from "framer-motion"

export function ProductivityCard({ score, streak }: { score: number, streak: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"
  
  return (
    <div style={{
      padding: "20px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)"
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        Today
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 64, height: 64 }}>
          <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="26" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <motion.circle
              cx="32" cy="32" r="26" fill="none"
              stroke={color} strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - score / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color
          }}>
            {score}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
            🔥 {streak}
          </div>
          <div style={{ fontSize: 11, color: "#475569" }}>day streak</div>
        </div>
      </div>
    </div>
  )
}
```

---

### frontend/components/VoiceInput.tsx
```typescript
"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export function VoiceInput({
  onTranscript, disabled
}: {
  onTranscript: (text: string) => void
  disabled: boolean
}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  }, [])

  const toggleListen = () => {
    if (!supported || disabled) return
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.start()
  }

  if (!supported) return null

  return (
    <motion.button
      onClick={toggleListen}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      style={{
        width: 44, height: 44,
        background: listening
          ? "rgba(239,68,68,0.2)"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0
      }}
    >
      {listening ? "🔴" : "🎤"}
    </motion.button>
  )
}
```

---

### frontend/components/HabitLogger.tsx
```typescript
"use client"
import { useState } from "react"
import { motion } from "framer-motion"

export function HabitLogger({
  taskTitle, uid, onClose
}: {
  taskTitle: string
  uid: string
  onClose: () => void
}) {
  const [location, setLocation] = useState<string>("home")
  const [focus, setFocus] = useState(7)
  const [distractions, setDistractions] = useState(1)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/habits/${uid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_title: taskTitle,
        location, focus_score: focus,
        distractions, duration_minutes: 60
      })
    })
    setSaving(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      style={{
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 10, padding: 14, marginBottom: 8, overflow: "hidden"
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", marginBottom: 12 }}>
        Log focus session
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {["home", "library", "classroom", "other"].map(loc => (
          <button
            key={loc}
            onClick={() => setLocation(loc)}
            style={{
              background: location === loc ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${location === loc ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              color: location === loc ? "#6366f1" : "#94a3b8",
              borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600
            }}
          >{loc}</button>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>
          Focus score: {focus}/10
        </div>
        <input type="range" min={1} max={10} value={focus}
          onChange={e => setFocus(+e.target.value)}
          style={{ width: "100%", accentColor: "#6366f1" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={saving} style={{
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none", borderRadius: 8, padding: "6px 14px",
          color: "white", fontSize: 12, fontWeight: 600
        }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "6px 14px",
          color: "#94a3b8", fontSize: 12
        }}>Cancel</button>
      </div>
    </motion.div>
  )
}
```

---

### package.json
```json
{
  "name": "prodo-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "framer-motion": "^11.0.0",
    "recharts": "^2.12.0",
    "@hello-pangea/dnd": "^16.5.0",
    "firebase": "^10.12.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
```

---

## BUILD ORDER — FOLLOW EXACTLY

1. Create project folder: prodo/
2. Create .env file with ALL keys filled in
3. Copy this file as GEMINI.md
4. Build backend first:
   a. Create all files in backend/
   b. pip install -r requirements.txt
   c. Start: uvicorn main:app --reload --port 8000
   d. Test: curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d '{"message":"I have a presentation Friday","uid":"demo-user-001"}' --no-buffer
   e. You MUST see SSE events streaming before touching frontend
5. Build frontend:
   a. Create all files in frontend/
   b. npm install
   c. npm run dev
   d. Open http://localhost:3000

## VERIFICATION — MUST PASS BEFORE FRONTEND

The curl test MUST show these events in order:
- data: {"type": "thinking", "label": "listening"}
- data: {"type": "thinking", "label": "planning"}
- data: {"type": "response", "payload": "...real Gemini text..."}
- data: {"type": "done"}

If the response payload is empty, echoed, or generic → fix backend before proceeding.

## WHAT NOT TO BUILD

- ❌ Any hardcoded times or scores
- ❌ Mock or fake Gemini responses
- ❌ Login/auth pages (use fixed UID for hackathon)
- ❌ MCP protocol
- ❌ Server-side TTS
- ❌ Complex error pages

