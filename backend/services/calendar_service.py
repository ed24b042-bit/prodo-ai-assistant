from dotenv import load_dotenv
import os
from datetime import datetime
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from services.firestore_service import db

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000")
REDIRECT_URI = f"{API_URL}/auth/callback"
SCOPES = ["https://www.googleapis.com/auth/calendar"]

def get_flow(state=None):
    client_config = {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        state=state
    )

def get_auth_url(uid: str) -> str:
    flow = get_flow(state=uid)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true"
    )
    return auth_url

async def handle_callback(code: str, state: str):
    try:
        uid = state
        flow = get_flow(state=state)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        
        data = {
            "calendarAccessToken": credentials.token,
            "calendarRefreshToken": credentials.refresh_token or "",
            "updatedAt": datetime.utcnow()
        }
        if not user_doc.exists:
            data["createdAt"] = datetime.utcnow()
            data["email"] = ""
            data["displayName"] = "User"
            data["timezone"] = "UTC"
            user_ref.set(data)
        else:
            user_ref.update(data)

        # Test Google Calendar API connection immediately after storing credentials
        try:
            print(f"Testing Google Calendar API connection for user {uid}...")
            service = build("calendar", "v3", credentials=credentials)
            calendar_list = service.calendarList().list().execute()
            calendars = [cal.get("summary") for cal in calendar_list.get("items", [])]
            print(f"Google Calendar API test SUCCEEDED! Found calendars: {calendars}")
        except Exception as api_err:
            print(f"Google Calendar API test FAILED for user {uid}. Check if Calendar API is enabled in Google Cloud Console. Error: {api_err}")
            import traceback
            traceback.print_exc()

        return credentials

    except Exception as e:
        print(f"Error handling oauth callback: {e}")
        return None

def get_calendar_service(uid: str):
    try:
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return None
        data = user_doc.to_dict()
        access_token = data.get("calendarAccessToken")
        refresh_token = data.get("calendarRefreshToken")
        
        if not access_token:
            return None
            
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            scopes=SCOPES
        )
        
        return build("calendar", "v3", credentials=creds)
    except Exception as e:
        print(f"Error getting calendar service: {e}")
        return None

async def create_calendar_event(uid: str, task: dict):
    try:
        service = get_calendar_service(uid)
        if not service:
            print(f"Calendar not configured or not authorized for user {uid}")
            return
            
        start_time = task.get("scheduled_start") or task.get("startTime")
        end_time = task.get("scheduled_end") or task.get("endTime")
        
        if not start_time or not end_time:
            print(f"Skipping calendar sync for task '{task.get('title')}' due to missing times.")
            return

        event = {
            'summary': task.get("title"),
            'description': task.get("description", task.get("priority_reasoning", "Scheduled by Prodo")),
            'start': {
                'dateTime': start_time,
            },
            'end': {
                'dateTime': end_time,
            },
        }
        
        existing_event_id = task.get("calendar_event_id") or task.get("calendarEventId")
        if existing_event_id:
            try:
                service.events().update(calendarId='primary', eventId=existing_event_id, body=event).execute()
                print(f"Updated calendar event {existing_event_id} for task '{task.get('title')}'")
                return
            except Exception:
                pass

        created_event = service.events().insert(calendarId='primary', body=event).execute()
        event_id = created_event.get('id')
        print(f"Created calendar event {event_id} for task '{task.get('title')}'")
        
        task_id = task.get("id")
        if task_id:
            db.collection("tasks").document(task_id).update({
                "calendar_event_id": event_id,
                "calendarEventId": event_id
            })
        else:
            # Fallback to query by title
            tasks_ref = db.collection("tasks")
            query = tasks_ref.where("uid", "==", uid).where("title", "==", task.get("title")).stream()
            for doc in query:
                doc.reference.update({
                    "calendar_event_id": event_id,
                    "calendarEventId": event_id
                })
            
    except Exception as e:
        print(f"Error creating calendar event: {e}")

async def delete_calendar_event(uid: str, event_id: str):
    try:
        service = get_calendar_service(uid)
        if not service:
            print(f"Calendar not configured or not authorized for user {uid}")
            return
        if event_id:
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            print(f"Deleted calendar event {event_id} for user {uid}")
    except Exception as e:
        print(f"Error deleting calendar event {event_id}: {e}")
