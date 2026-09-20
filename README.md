# FRIDAY — Personal AI Assistant

FRIDAY is a personal AI assistant web application designed as an intelligent operating layer providing natural interaction, explicit persistent memory, vector-based knowledge retrieval, and real-time HUD status monitoring.

---

## 🏛️ Architecture Overview

The system is structured across decoupled frontend and serverless backend environments:

* **Frontend**: Single-page web application hosted on **GitHub Pages**, featuring a responsive futuristic HUD interface, voice interaction (STT & TTS), and real-time network/system status.
* **Backend**: **Cloudflare Workers** acting as the API layer and orchestrator.
* **AI Engine**: **Cloudflare Workers AI** powered by `@cf/zai-org/glm-4.7-flash`.
* **Persistent Memory**: **Cloudflare KV** for explicit key-value persistent user memories.
* **Knowledge Base**: **Cloudflare AI Search** (`friday-knowledge` instance, `default` namespace, `vector` retrieval).

---

## 🎨 Frontend Features & UX

* **Arc Reactor Core**: Dynamic visual HUD reactor indicator displaying state changes (idle, thinking, listening).
* **HUD Telemetry Panels**: Real-time status for local calendar/clock, memory connection, and system network status.
* **Natural Voice Capabilities**: Integrated Speech Recognition (STT) and Speech Synthesis (TTS) with multi-language fallback support.
* **Responsive Design**: Mobile-first layout optimized across desktop and mobile browsers.

---

## 🛠️ Local Development & Deployment

### View Frontend Locally

Simply serve `index.html` using any HTTP server:

```bash
# Example using Python
python3 -m http.server 8000
```

Open `http://localhost:8000` in your web browser.

### Configuration

* Backend worker endpoint: `https://friday-ai.elbrayan7894435.workers.dev`
* User session IDs are safely generated and retained locally via `localStorage` (`friday_user_id`).

---

## 📜 Agent Guidelines & Rules

All development on FRIDAY follows strict safety, privacy, memory distinction, and architecture guidelines detailed in [`AGENTS.md`](./AGENTS.md).
