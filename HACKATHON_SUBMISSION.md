# ProDo: The Last-Minute Life Saver — Project Submission

---

## 1. Title Page
* **Project Name**: ProDo (The Last-Minute Life Saver)
* **Tagline**: The conversational, context-aware AI executive assistant that proactively keeps you ahead of your deadlines.
* **Team Members**: [Insert Names Here]
* **Submission Date**: [Insert Date Here]

---

## 2. Problem Statement Selected: The Last-Minute Life Saver

### Background & Challenge
Students, professionals, and entrepreneurs face a constant deluge of tasks, meetings, assignments, and payments. While the market is saturated with digital planners, calendars, and reminder apps, they fail because they are **passive**. They rely on the user manually inputting details, managing complex forms, and checking dashboards. When a user gets busy, they stop updating the tool. Passive alerts are easily ignored, swiped away, or forgotten, doing little to help the user take meaningful action.

### The Opportunity
Our solution, **ProDo**, addresses this by transforming the task-management experience from a passive repository into a **proactive conversational assistant**. ProDo mimics the experience of texting a smart, highly organized friend. By listening to natural language, parsing scheduling intents, analyzing habits, resolving calendar conflicts automatically, and using memory consolidation, ProDo helps users make better decisions and actually complete tasks before deadlines are missed.

---

## 3. Solution Overview

**ProDo** is an agentic, full-stack productivity companion designed to proactively assist users in planning, prioritizing, and executing daily schedules. 

Instead of filling out form fields for title, date, duration, priority, and list categories, the user simply texts or talks to Prodo:
* *User:* "I have a chemistry assignment due Friday, I need about 2 hours to write the report and do some reading."
* *ProDo:* Internally processes the text, routes the intent, extracts the tasks, cross-references existing tasks for conflicts, schedules them into optimal slots matching the user's focus patterns, syncs them to Google Calendar, and replies with a friendly confirmation.

### Core Approach
1. **Low Friction**: Voice and chat-based natural language interfaces minimize administrative overhead.
2. **Proactive Planning**: Rather than waiting for instructions, the agent identifies free time slots, reasons through task priorities, and proposes realistic plans.
3. **Behavioral Adaptability**: It tracks focus sessions, locations, and distraction rates to build a profile of the user's peak productivity hours, scheduling harder tasks during those windows.
4. **Permanent Context (Memory)**: Raw conversational details are summarized weekly into long-term structured insights, allowing the agent to continuously adapt to the user's preferences over time.

---

## 4. Key Features

Here is the status of the features implemented in the ProDo codebase:

| Feature Name | Description | Status |
| :--- | :--- | :--- |
| **Natural Language Task Input** | Users enter tasks using natural phrasing; the system extracts key parameters. | **Implemented** |
| **LLM-Based Parameter Extraction** | Automatically parses task title, deadline, estimated duration, and priority. | **Implemented** |
| **AI-Powered Scheduling Assistance** | Verifies time-slot availability, handles relative timing, and resolves calendar collisions. | **Implemented** |
| **Voice-Enabled Assistance** | Speech-to-text voice input directly integrated into the chat UI. | **Implemented** |
| **Google Calendar Sync** | Real-time bi-directional integration reading and writing task events via Google OAuth. | **Implemented** |
| **Habits & Focus Logging** | Tracks focus duration, distractions, and work locations (home, library, class, etc.). | **Implemented** |
| **AI Peak Hour Coaching** | Learns peak focus windows from user habit logs (after 5+ entries) to optimize schedules. | **Implemented** |
| **Productivity & Streak Tracker** | Dynamically calculates daily score (0-100) and consecutive productive streaks. | **Implemented** |
| **Dark Glassmorphic UI** | Responsive frontend featuring interactive panels and drag-and-drop task reordering. | **Implemented** |
| **Real-time SSE Thinking Feed** | Server-Sent Events stream agent thinking states (*listening, planning, coaching*) as they happen. | **Implemented** |
| **Dual-Tier Memory Architecture** | Standard 7-day conversation history combined with structured permanent insights. | **Implemented** |
| **Weekly Memory Cleanup** | An automated background cron job that extracts long-term insights and flushes raw logs. | **Implemented** |
| **Autonomous Task Execution** | Allowing the AI to write draft emails, code, or execute API requests on behalf of the user. | *Planned / Roadmap* |

---

## 5. Technologies Used

### Frontend
* **Next.js 14 (App Router)**: Core framework configured in strict TypeScript mode for routing and UI rendering.
* **Tailwind CSS**: Custom dark mode UI implementation leveraging glassmorphism and modern typography.
* **Framer Motion**: Smooth animations for transitions, modals, and real-time streaming state glows.
* **Recharts**: Responsive charting library for displaying historical productivity and habit trends.
* **@hello-pangea/dnd**: Draggable interface allowing users to manually re-order and prioritize task cards.
* **Firebase Client SDK (v10)**: Real-time authentication states and database synchronizations.

### Backend
* **Python 3.11 / FastAPI**: High-performance backend hosting REST and Server-Sent Event (SSE) streaming API endpoints.
* **LangGraph**: Orchestrates the multi-agent cognitive architecture and manages conversation state transitions.
* **Uvicorn**: Asynchronous gateway interface server hosting the backend.
* **APScheduler**: Advanced Python Scheduler running the automated weekly memory synthesis job.

---

## 6. Google Technologies Utilized

ProDo utilizes a robust suite of Google technologies to create a secure, intelligent, and highly integrated application:

* **Google Gemini API (`gemini-1.5-flash`)**: 
  * Powering all LLM reasoning steps across our agents.
  * We utilize `gemini-1.5-flash` for its sub-second response times, excellent structured JSON generation, and high token efficiency.
  * Prompts are specifically written to return clean JSON schemas for intent routing, task extraction, scheduling coordinates, and habit calculations.
* **Google Calendar API**: 
  * Bi-directional synchronization. As soon as the Planner agent schedules a task (or a user edits/completes one on the frontend), ProDo automatically issues OAuth tokens to create, update, or delete matching calendar events on the user's primary Google Calendar.
* **Firebase Authentication**: 
  * Handles user registration, Google Login, and session persistence securely on the frontend.
* **Google Cloud Firestore**: 
  * Serves as our primary real-time database. All tasks, messages, habit logs, memory insights, and productivity scores are stored in Firestore, enabling instant synchronizations between backend agents and frontend React states.

---

## 7. Agentic Depth / Autonomy

ProDo is built around a **directed agent graph** designed to move beyond basic command execution:

```
                  ┌───────────────┐
                  │  User Message │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   The Brain   │
                  │ (Orchestrator)│
                  └───────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    [Needs Planning?]           [Needs Coaching?]
            │                           │
            ▼                           ▼
    ┌───────────────┐           ┌───────────────┐
    │ Planner Agent │           │  Coach Agent  │
    └───────┬───────┘           └───────┬───────┘
            │                           │
            └─────────────┬─────────────┘
                          │
                          ▼
            ┌───────────────────────────┐
            │  Final Response Generator │
            └───────────────────────────┘
```

### Cognitive Node Functionality:
1. **The Brain (Intent Router)**: Rather than executing a static code script, every message goes to the Brain first. It reads the current time, user message, conversation logs, and permanent memory constraints. It decides autonomously if it needs to trigger the `Planner` (scheduling), the `Coach` (habits/streaks), or resolve the request directly.
2. **The Planner (Task Reasoning & Scheduling)**: If scheduled parameters are vague or missing, the Planner searches for open calendar blocks, aligns them with the user's peak performance hours, and resolves conflicts. It prioritizes tasks based on deadline urgency and complexity, returning structured color codes (`#ef4444` for high, `#6366f1` for medium, `#22c55e` for low).
3. **The Coach (Behavioral Analyzer)**: Reviews historical logs and updates productivity indices daily. If the user has logged less than 5 focus sessions, it prompts them to log more. Once 5 logs are recorded, the Coach begins parsing correlations (e.g., *"You focus 30% better at the library than at home"* or *"Your distraction levels peak after 4 PM"*) to autonomously tailor scheduling.
4. **Memory Agent (Background Synthesis)**: Every 7 days, this agent runs asynchronously to read the past week's message transcripts, extract permanent insights (e.g., preferences, recurring routines, habits), store them in a long-term collection, and purge the raw chat transcripts. This ensures the assistant gets smarter without swelling database sizes or token counts.

---

## 8. Hackathon Evaluation Alignment

* **Problem Solving & Impact (20%)**: Replaces administrative overhead and easily ignored notifications with interactive, natural-language conversation that schedules tasks and guides focus.
* **Agentic Depth (20%)**: Multi-agent graph (Brain, Planner, Coach, Memory) utilizing shared state, intent routing, relative scheduling algorithms, and autonomous weekly memory compression.
* **Innovation & Creativity (20%)**: Conversational assistant that feels like a messaging app, integrating voice, peak hour habit-analysis, and real-time streaming "thinking" steps.
* **Usage of Google Technologies (15%)**: Deep stack integration of Google Gemini, Google Calendar sync via OAuth, Firebase Auth, and Firestore.
* **Product Experience & Design (10%)**: Premium dark mode design with glassmorphic cards, charts for focus scoring, custom animated icons, and drag-and-drop task prioritization panels.
* **Technical Implementation & Completeness (15%)**: Production-grade implementation using Next.js, FastAPI, and LangGraph, fully running with no mocked interfaces.

---

## 9. Screenshots / Demo Links

* **Product Demo Video**: [Insert YouTube / Loom Link Here]
* **Live Application URL**: [Insert Link Here]
* **GitHub Repository**: [https://github.com/ed24b042-bit/prodo-ai-assistant](https://github.com/ed24b042-bit/prodo-ai-assistant)

*(Note: Ensure that Firebase rules, Firestore keys, and Google Calendar OAuth client settings are set to testing/public mode during the evaluation window to allow judges access).*
