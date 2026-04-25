# 🐷 HogAI v2.0 — AI Chat Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+_Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Groq](https://img.shields.io/badge/Groq-Free_API-orange?style=for-the-badge)](https://console.groq.com)

---

## 📁 Project Structure

```
hogai/
├── frontend/
│   ├── index.html       # Markup only — semantic HTML5
│   ├── style.css        # Design system with CSS variables
│   └── js/
│       ├── main.js      # Entry point — wires everything together
│       ├── api.js       # All fetch/SSE calls to the backend
│       ├── chat.js      # Chat state + localStorage history
│       └── ui.js        # All DOM rendering & animations
│
└── backend/
    ├── main.py          # FastAPI app entry point
    ├── requirements.txt
    ├── .env.example
    ├── core/
    │   └── config.py    # Settings via pydantic-settings
    ├── models/
    │   └── schemas.py   # Pydantic request/response models
    ├── routers/
    │   ├── health.py    # GET / and GET /health
    │   └── chat.py      # POST /api/chat and /api/chat/stream
    ├── services/
    │   └── groq_service.py  # All Groq API logic
    └── middleware/
        └── rate_limit.py    # IP-based rate limiting (20 rpm)
```

---

## 🚀 Quick Start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY to .env
uvicorn main:app --reload --port 8000
```

Get a free Groq API key at: https://console.groq.com

API docs: http://localhost:8000/docs

### Frontend

Open `frontend/index.html` in browser — no build step needed!

> Update `API_BASE` in `js/api.js` when deploying.

---

## 📡 API Endpoints

| Method | Endpoint           | Description            |
|--------|--------------------|------------------------|
| GET    | `/`                | Root info              |
| GET    | `/health`          | Health + Groq status   |
| POST   | `/api/chat`        | Full response          |
| POST   | `/api/chat/stream` | SSE streaming          |

---

## 🌐 Deploy

**Backend → Render.com**
- Root: `backend/`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env var: `GROQ_API_KEY=gsk_...`

**Frontend → GitHub Pages**
- Update `API_BASE` in `js/api.js` to your Render URL
- Enable GitHub Pages from `frontend/` folder

---

## 🎓 Was ich dabei gelernt habe

- **Modulares JavaScript** — ES6 Modules, Separation of Concerns
- **FastAPI Architektur** — Routers, Services, Middleware, Schemas
- **Streaming** — Server-Sent Events (SSE) von Backend bis Frontend
- **Clean Code** — jede Datei hat eine klare Verantwortung

---

<div align="center">

**Gebaut mit 💙 — Bewerbungsprojekt für Fachinformatiker Anwendungsentwicklung**

</div>
