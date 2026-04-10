import os
import time
from flask import Blueprint, request, jsonify
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

gemini_bp = Blueprint('gemini', __name__)

api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    print("⚠️  WARNING: GROQ_API_KEY is not set. AI Tutor will not work.")
    client = None
else:
    client = Groq(api_key=api_key)

# Simple rate limiter per IP
last_request_time = {}
RATE_LIMIT_SECONDS = 3


@gemini_bp.route('/api/gemini/ask', methods=['POST'])
def ask_gemini():
    if not client:
        return jsonify({"error": "GROQ_API_KEY is not configured on the server."}), 500

    data = request.get_json()

    if not data or 'prompt' not in data:
        return jsonify({"error": "Prompt is required"}), 400

    prompt = data.get("prompt", "").strip()
    course_name = data.get("courseName", "this course")

    if not prompt:
        return jsonify({"error": "Prompt cannot be empty"}), 400

    # Rate limiting per IP
    ip = request.remote_addr
    now = time.time()
    if ip in last_request_time:
        elapsed = now - last_request_time[ip]
        if elapsed < RATE_LIMIT_SECONDS:
            wait = round(RATE_LIMIT_SECONDS - elapsed, 1)
            return jsonify({
                "error": f"Please wait {wait} seconds before sending another message."
            }), 429

    last_request_time[ip] = now

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are a helpful AI tutor for the course '{course_name}'. "
                        "Answer questions clearly and concisely about course concepts, "
                        "exercises, career paths, and how to get started. "
                        "Keep responses friendly and educational."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            temperature=0.7,
        )

        response_text = chat_completion.choices[0].message.content
        return jsonify({"response": response_text})

    except Exception as e:
        error_msg = str(e)
        print(f"Groq API Error: {error_msg}")

        if "429" in error_msg or "rate_limit" in error_msg.lower():
            return jsonify({
                "error": "Too many requests. Please wait a moment and try again."
            }), 429
        elif "401" in error_msg or "invalid_api_key" in error_msg.lower():
            return jsonify({
                "error": "Invalid API key configuration. Please contact support."
            }), 401
        else:
            return jsonify({
                "error": "AI service temporarily unavailable. Please try again."
            }), 500
