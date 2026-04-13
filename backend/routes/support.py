from flask import Blueprint, request, jsonify
import google.generativeai as genai
import os

support_bp = Blueprint("support", __name__)

# Fallback fake response if no key is present during dev
FAKE_RESPONSE = "Hi! I am the automated LearnGo Technical Support Agent (Development Mode). I see you have a question. In production, I would connect to the Gemini API to resolve your issue. Please Escalate to a Human, or set your GEMINI_API_KEY to continue!"

SYSTEM_PROMPT = """You are the LearnGo Technical Support Agent. 
Be polite, concise, and help users resolve issues concerning course access, schedule syncing, billing, and account configurations.
If the issue is highly complex or you cannot resolve it easily, encourage the user to click 'Escalate to Human'.
Use short, readable paragraphs or bullet points if necessary.
"""

@support_bp.route("/api/support-chat", methods=["POST"])
def support_chat():
    try:
        req = request.get_json()
        message = req.get("message", "")
        # Optional: history parameter to keep context
        history = req.get("history", [])

        if not message:
            return jsonify({"status": "error", "message": "Message is required"}), 400

        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            return jsonify({
                "status": "success",
                "reply": FAKE_RESPONSE
            })

        genai.configure(api_key=gemini_api_key)
        
        # We use Flash for quick responses
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Convert simplistic dict history to google.generativeai Content objects
        # Format expected by frontend: [{'role': 'user', 'content': '...'}, {'role': 'model', 'content': '...'}]
        formatted_history = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg.get("content", "")]})

        chat = model.start_chat(history=formatted_history)

        # Inject system instructions as the very first message internally if history is empty
        # Wait, start_chat doesn't take system_instruction in all wrapper versions natively easily.
        # So we can pass it via SDK if supported or just prepend context to user message.
        prompt = message
        if not history:
            prompt = f"{SYSTEM_PROMPT}\n\nUser Issue:\n{message}"

        response = chat.send_message(prompt)

        return jsonify({
            "status": "success",
            "reply": response.text
        })
    except Exception as e:
        print(f"Support API Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
