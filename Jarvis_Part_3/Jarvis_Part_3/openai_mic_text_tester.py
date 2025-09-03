from openai import OpenAI
from dotenv import load_dotenv
import os

# Load variables from .env file
load_dotenv()

# Get API key from .env
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("❌ OPENAI_API_KEY not found in .env file")

client = OpenAI(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello, are you working?"}],
        max_tokens=20
    )
    print("✅ API key works!")
    print("Response:", response.choices[0].message.content.strip())
except Exception as e:
    print("❌ API key error:", e)
