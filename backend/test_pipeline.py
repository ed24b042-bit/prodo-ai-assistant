import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.brain import classify_intent, extract_task_details, check_missing_information, schedule_task

def run_test():
    load_dotenv()
    print("=== Testing Agent Intent Classifier ===")
    
    # Test 1: Creating a task
    intent_create = classify_intent(
        user_message="I have a presentation tomorrow at 10 AM",
        last_assistant_question=None,
        draft_task=None,
        history=[]
    )
    print("Test 1 (Create Task) Intent:", intent_create)
    assert intent_create == "create_task"
    
    # Test 2: Answering a question about duration
    intent_ans = classify_intent(
        user_message="4 hours",
        last_assistant_question="duration",
        draft_task={"title": "Presentation", "date": "tomorrow", "startTime": "10:00 AM"},
        history=[
            {"role": "user", "content": "I have a presentation tomorrow at 10 AM"},
            {"role": "assistant", "content": "How long will that take?"}
        ]
    )
    print("Test 2 (Answer Duration) Intent:", intent_ans)
    assert intent_ans == "answer_question"

    # Test 3: Confirming
    intent_confirm = classify_intent(
        user_message="yes",
        last_assistant_question="confirmation",
        draft_task={"title": "Presentation", "date": "tomorrow", "startTime": "10:00 AM", "duration": 240},
        history=[
            {"role": "user", "content": "4 hours"},
            {"role": "assistant", "content": "Got it! I proposed Presentation tomorrow at 10 AM for 4 hours. Do you want me to schedule it?"}
        ]
    )
    print("Test 3 (Confirm) Intent:", intent_confirm)
    assert intent_confirm == "confirm"

    print("\n=== Testing Agent Task Extraction ===")
    
    # Test 4: Extraction of details
    draft_1 = extract_task_details(
        user_message="I have a presentation tomorrow at 10 AM",
        current_datetime="2026-06-29T12:00:00",
        draft_task=None,
        last_assistant_question=None
    )
    print("Extracted Draft 1:", draft_1)
    assert draft_1.get("title") == "presentation" or "presentation" in draft_1.get("title", "").lower()
    
    # Test 5: Follow up extraction
    draft_2 = extract_task_details(
        user_message="4 hours",
        current_datetime="2026-06-29T12:00:00",
        draft_task=draft_1,
        last_assistant_question="duration"
    )
    print("Extracted Draft 2 (Follow up):", draft_2)
    assert draft_2.get("duration") == 240
    
    # Test 6: Verify yes/no/4 hours never become task title
    draft_filler = extract_task_details(
        user_message="yes",
        current_datetime="2026-06-29T12:00:00",
        draft_task={"title": "Presentation", "duration": 240},
        last_assistant_question="confirmation"
    )
    print("Extracted Draft with 'yes' answer title check:", draft_filler)
    assert draft_filler.get("title") != "yes"

    print("\n=== Testing Missing Information Checker ===")
    missing_1 = check_missing_information(draft_1)
    print("Missing fields for Draft 1 (before duration):", missing_1)
    assert "duration" in missing_1
    
    missing_2 = check_missing_information(draft_2)
    print("Missing fields for Draft 2 (after duration):", missing_2)
    assert len(missing_2) == 0

    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    run_test()
