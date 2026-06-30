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
