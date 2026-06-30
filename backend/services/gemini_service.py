import google.generativeai as genai
import os, json
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-flash-latest")

import time

def call_gemini(prompt: str) -> str:
    start_time = time.time()
    response = model.generate_content(prompt)
    elapsed = (time.time() - start_time) * 1000
    print(f"  [LLM Call] call_gemini: {elapsed:.1f} ms", flush=True)
    return response.text.strip()

def call_gemini_json(prompt: str) -> dict:
    start_time = time.time()
    response = model.generate_content(prompt)
    elapsed = (time.time() - start_time) * 1000
    print(f"  [LLM Call] call_gemini_json: {elapsed:.1f} ms", flush=True)
    text = response.text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip().rstrip("```")
    return json.loads(text.strip())
