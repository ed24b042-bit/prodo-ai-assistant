import httpx
import json
import time

url = "http://127.0.0.1:8002/api/chat"
headers = {"Content-Type": "application/json"}
data = {
    "message": "I have a presentation Friday",
    "uid": "demo-user-001",
    "sentAt": time.time() * 1000
}

print("Sending request to:", url)
try:
    with httpx.stream("POST", url, headers=headers, json=data, timeout=60.0) as r:
        print("Status code:", r.status_code)
        for line in r.iter_lines():
            if line:
                print(line)
except Exception as e:
    print("Error occurred:", e)
