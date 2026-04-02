# 🐷 HogAI — AI Chat Platform

> **A DeepSeek-inspired AI assistant** built with vanilla HTML/CSS/JS frontend and a Python FastAPI backend — connected to the Claude API with real-time streaming.

[![Live Demo](https://img.shields.io/badge/Live-Demo-00b4ff?style=for-the-badge&logo=vercel)](https://your-username.github.io/hogai)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 💡 Warum dieses Projekt?

Ich lerne Webentwicklung selbstständig und wollte nicht nur kleine Übungen machen — ich wollte etwas **Echtes** bauen.

HogAI ist mein erstes Full-Stack-Projekt: ein komplett funktionierender AI-Chatbot mit eigenem Backend, Streaming-API und professionellem UI-Design. Ich habe dabei gelernt, wie Frontend und Backend zusammenarbeiten, wie man mit externen APIs umgeht und wie man Code sauber strukturiert.

---

## ✨ Features

- 💬 **Real-time streaming** — AI responses appear word by word (Server-Sent Events)
- 🎨 **Custom dark UI** — glassmorphism design with CSS animations, built from scratch
- 📂 **Separated codebase** — `index.html` · `style.css` · `app.js` — clean structure
- 🐍 **Python FastAPI backend** — REST API with CORS, error handling, async support
- 💾 **Chat history** — saved locally via localStorage
- 📊 **Token counter** — tracks API usage per session
- 📱 **Responsive** — works on mobile and desktop

---

## 🛠 Tech Stack

| Layer           | Technologie                         |
|-----------------|-------------------------------------|
| Frontend        | HTML5, CSS3 (Glassmorphism), JS ES6 |
| Backend         | Python 3.11, FastAPI, Uvicorn       |
| AI API          | Groq (llama-3.3-70b-versatile)  |
| Streaming       | Server-Sent Events (SSE)            |
| Deployment      | GitHub Pages + Render.com (free)    |
| Version Control | Git + GitHub                        |

---

## 📁 Projektstruktur

```
hogai/
├── index.html        # HTML structure only — no inline styles or scripts
├── style.css         # All styles: variables, animations, glassmorphism
├── app.js            # All logic: API calls, streaming, history, DOM
│
└── backend/
    ├── main.py       # FastAPI app — chat & streaming endpoints
    ├── requirements.txt
    └── .env.example
```

> Clean separation of concerns: HTML für Struktur, CSS für Design, JS für Logik.

---

## 🚀 Local Setup

### 1. Clone the repo
```bash
git clone https://github.com//hogai.git
cd hogai
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your Anthropic API key to .env
```

### 3. Run the server
```bash
uvicorn main:app --reload --port 8000bagdanchik007
```

### 4. Open frontend
Einfach `index.html` im Browser öffnen — kein Build-Schritt nötig!

---

## 📡 API Endpoints

| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| GET    | `/health`          | Health check             |
| POST   | `/api/chat`        | Single response          |
| POST   | `/api/chat/stream` | Streaming response (SSE) |

**Request body:**
```json
{
  "messages": [{ "role": "user", "content": "Hello!" }],
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048
}
```

---

## 🎓 Was ich dabei gelernt habe

Dieses Projekt hat mir gezeigt, wie Full-Stack-Entwicklung in der Praxis funktioniert:

- **Frontend ↔ Backend Kommunikation** via `fetch()` und REST API
- **Asynchrones JavaScript** — async/await, ReadableStream für SSE
- **Python Backend** — FastAPI, Pydantic models, CORS Middleware
- **API Integration** — Anthropic SDK, error handling, rate limits
- **Clean Code** — Trennung von HTML, CSS und JS; sinnvolle Kommentare
- **Git Workflow** — commits, GitHub Pages deployment

---

## 🔮 Geplante Features

- [ ] Markdown rendering mit Syntax Highlighting
- [ ] Modell-Auswahl im UI
- [ ] Dark / Light Mode Toggle
- [ ] Persistente History mit SQLite
- [ ] User Authentication

---

## 👨‍💻 Über mich

Ich bewerbe mich für eine **Ausbildung zum Fachinformatiker Anwendungsentwicklung**.

Ich lerne seit mehreren Monaten selbstständig Programmieren und baue echte Projekte — nicht nur Tutorials. HogAI zeigt, dass ich in der Lage bin, ein Full-Stack-Projekt von der Idee bis zur Umsetzung selbst zu realisieren.

**Skills:**
- HTML / CSS — eigene Designs, Animationen, responsive Layouts
- JavaScript (ES6+) — DOM, fetch, async/await, localStorage
- Python — FastAPI, REST APIs, externe SDKs
- Git & GitHub — Versionskontrolle, saubere Projektstruktur

**Sprachen:** Russisch (Muttersprache) · Deutsch (B1+) · Englisch (~B1)

📧 **E-Mail:** bogdanskibitskyi@gmail.com 
🔗 **GitHub:** [github.com/bagdanchik007](https://github.com/bagdanchik007)

---

## 📄 License

MIT — feel free to use, work and learn from this project.
Also a good project to study with.(Learning by writing)

---

<div align="center">

**Gebaut mit 💙 — Bewerbungsprojekt für Fachinformatiker Anwendungsentwicklung**

*„Der beste Weg zu lernen ist, echte Projekte zu bauen."*

</div>
