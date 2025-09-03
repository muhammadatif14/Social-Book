from dotenv import load_dotenv
import os
import openai
import requests
from datetime import date, timedelta

# Load .env file
load_dotenv()

# Get API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌ No OPENAI_API_KEY found in .env file.")
    exit()

# Set API key for OpenAI
openai.api_key = api_key

print("🔍 Checking OpenAI API key and quota...")

# 1. Test if API key is valid
try:
    models = openai.models.list()
    print(f"✅ API key is valid. Found {len(models.data)} models.")
except Exception as e:
    print("❌ API key test failed:", e)
    exit()

# 2. Check recent usage from OpenAI Billing API
headers = {"Authorization": f"Bearer {api_key}"}

end_date = date.today()
start_date = end_date - timedelta(days=7)

usage_url = f"https://api.openai.com/v1/dashboard/billing/usage?start_date={start_date}&end_date={end_date}"
resp = requests.get(usage_url, headers=headers)

if resp.status_code == 200:
    usage_data = resp.json()
    total_usage_usd = usage_data.get("total_usage", 0) / 100  # cents to USD
    print(f"💰 Usage (last 7 days): ${total_usage_usd}")
else:
    print("⚠️ Could not retrieve usage info:", resp.status_code, resp.text)

# 3. Try a small test request
try:
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Just say 'hello'"}]
    )
    print("🤖 Test model response:", response.choices[0].message.content)
except Exception as e:
    print("❌ API call failed:", e)
