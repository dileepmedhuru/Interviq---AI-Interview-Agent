# Interviq — AI Mock Interview Simulator

Interviq is a state-of-the-art, end-to-end **AI Mock Interview Simulator** designed to help developers and technical professionals practice mock interviews. The platform dynamically reads candidates' resumes, generates tailored question sets based on target roles, guides them through a realistic three-stage interview (MCQ, Live Coding, and Verbal Video Questions), and provides detailed AI-driven evaluation reports and PDF scorecards.

---

## 🚀 Key Features

* **📄 Resume-Aware Adaptive Setup**: Extracts experience, skills, and background details from uploaded PDFs or plain text resumes to generate target-specific questions.
* **📝 Stage 1: MCQ Assessment**: Evaluates baseline technical and conceptual knowledge with 5 custom multiple-choice questions.
* **💻 Stage 2: Coding Sandbox**: Runs real code execution checks against a curated problem bank with auto-indent support (Python colon detection).
* **🎥 Stage 3: Video Verbal Interview**: Conducts behavioral and conversational questions. Uses local microphone speech-to-text transcription to capture responses.
* **🤖 Stateful Adaptive Interview Agent**: Dynamically adjusts follow-up questions and difficulty (Easy ➔ Medium ➔ Hard) in real time depending on the candidate's scores.
* **📊 Comprehensive Evaluation Scorecard**: Summarizes category marks (relevance, clarity, depth), highlights strengths/weaknesses, and provides actionable recommendations.
* **📥 Direct PDF Scorecard Export**: Direct client-side PDF downloads utilizing `html2pdf.js` for clean paper/recruiter sharing.
* **🔗 Public Report Access**: Generates public, unauthenticated links (`public=true`) allowing users to easily share their scorecards.
* **✉️ Automatic Email Dispatch**: Sends a summary scorecard directly to the candidate's inbox using SMTP or Brevo integration.
* **🌓 Global Theme Toggle**: Responsive manual toggle button that lets users switch between light and dark theme mode, saving preferences locally.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5 (Semantic Layout), Vanilla CSS3 (3D Glassmorphism, animations), Vanilla JS (ES6 Modules, asynchronous fetch API), and `html2pdf.js` for document printing.
* **Backend**: FastAPI (Python 3.11) providing highly performant REST APIs and hosting static frontend routes.
* **Database**: MongoDB (via `pymongo` client) storing user sessions, resumes, and interview documents.
* **AI Engine**: Groq Cloud API running `llama-3.3-70b-versatile` with an automatic retry failover to `llama-3.1-8b-instant` if rate limits are exceeded.
* **Email Mailers**: Built-in support for SMTP and Brevo HTTP APIs.

---

## 📂 Project Directory Structure

```text
Interviq/
├── backend/                  # FastAPI Application Root
│   ├── config/               # Configurations (db, utils)
│   ├── routes/               # FastAPI Router Endpoints (auth, interview, resume, user)
│   ├── services/             # Core Services (ai_service, email_service, problem_bank, etc.)
│   └── server.py             # Server lifecycle, CORS, and SPA routing handler
├── frontend/                 # Client Static Files
│   ├── css/                  # Styling Sheets (base, components, 3d-effects)
│   ├── js/                   # Frontend Scripts (api, auth, dashboard, interview, theme, etc.)
│   └── pages/                # Client Views (HTML Templates)
├── .env.example              # Sample environment template
├── .gitignore                # Git ignores
├── app.py                    # Root runner script
├── Dockerfile                # Production Container Configuration
└── docker-compose.yml        # Development Docker orchestration
```

---

## 💻 Local Developer Setup

### 1. Prerequisites
* Python 3.11.x
* MongoDB Community Server (running locally on `mongodb://localhost:27017`)
* Git

### 2. Installation
Clone the repository:
```bash
git clone https://github.com/dileepmedhuru/Interviq---AI-Interview-Agent.git
cd Interviq
```

Create and activate a virtual environment:
* **Windows**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\activate
  ```
* **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

Install backend dependencies:
```bash
pip install -r requirements.txt
```

### 3. Environment Variables Setup
Duplicate `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key environment properties checklist:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-interview-agent
JWT_SECRET=your_jwt_secret_string
JWT_REFRESH_SECRET=your_jwt_refresh_secret_string
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### 4. Running the App
Start the unified FastAPI server:
```bash
python app.py
```
Open your browser and navigate to: **`http://localhost:5000`**

---

## ☁️ Deployment (Render + MongoDB Atlas)

### 1. Database Setup
1. Create a free **M0 cluster** on [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).
2. Configure database user access and whitelist IP access from anywhere (`0.0.0.0/0`).
3. Copy your MongoDB connection string: `mongodb+srv://<username>:<password>@cluster.mongodb.net/...`

### 2. Render Web Service Deployment
1. Log in to [Render](https://render.com/) and create a new **Web Service** linked to your GitHub repository.
2. Configure settings:
   * **Language**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn backend.server:app --host 0.0.0.0 --port $PORT`
   * **Instance Type**: `Free`
3. Add your environment keys inside the **Environment** tab:
   * `MONGO_URI` (Atlas connection string)
   * `GROQ_API_KEY` (Groq API Key)
   * `JWT_SECRET` & `JWT_REFRESH_SECRET`
   * `FRONTEND_URL` (Your Render app URL, e.g. `https://interviq.onrender.com`)
   * `EMAIL_USER` / `EMAIL_PASS` (Or setup `BREVO_API_KEY` to bypass SMTP blocks)

Save changes and your application will deploy and go live!
