import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print("API Key exists:", bool(api_key))
print("API Key starts with:", api_key[:5] if api_key else "None")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

try:
    response = model.generate_content("Hello! What is your name?")
    print("Response text:", response.text)
except Exception as e:
    print("Error occurred while calling Gemini:", e)
