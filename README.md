# LearnGo - Personalized Learning Dashboard

LearnGo is a high-fidelity, AI-powered learning platform designed to streamline knowledge acquisition through personalized course discovery and intelligent scheduling.

## 🚀 Features
- **Discovery Feed**: 25+ hand-curated courses across 7 technical branches (CS, Data Science, EE, ME, CE, Business, Physics).
- **Advanced Filtering**: Live search by instructor, topics, and branch with real-time matching.
- **ML Recommender**: Intelligent recommendation system that tracks user progress and interests.
- **Smart Scheduling**: Integrated weekly planner for course time-blocking and goal management.
- **Supabase Integration**: Robust persistence for user profiles and course enrollments.
- **Modern UI**: Built with React 19, Tailwind CSS v4, and Framer Motion for a premium, interactive experience.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide icons, Framer Motion.
- **Backend**: Python (Flask/FastAPI), Gemini AI SDK.
- **Database**: Supabase (PostgreSQL).

## 📥 Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Supabase account

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd ai_project
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

## 🔒 Environment Variables
Create a `.env` file in the `frontend` directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📄 License
MIT
