# StreamSync — Frontend

React + Vite frontend for the StreamSync video platform.

**Live:** [https://kapilraghav.info/streamsync](https://kapilraghav.info/streamsync)

---

## Architecture
```
frontend/src/
├── main.jsx                  # App entry point, WakeUp wrapper
├── App.jsx                   # Page routing
├── index.css                 # Global styles, font imports
├── constants/
│   └── api.js                # Single source of truth for API URL
├── styles/
│   └── common.js             # Shared style objects (inputs, buttons, cards)
├── components/
│   ├── Navbar.jsx            # Shared navbar used across all pages
│   └── WakeUp.jsx            # Backend wake-up screen with micro-drama facts
└── pages/
    ├── Shorts.jsx            # Scroll mode — YouTube Shorts style
    ├── Relax.jsx             # Relax mode — Bilibili/Netflix style
    ├── Watch.jsx             # Video player with danmaku + comments
    └── Upload.jsx            # Episode upload form
```

---

## Pages

**Shorts (`/` default)**
- Fullscreen vertical scroll with `scroll-snap`
- Keyboard ↑↓ navigation
- Tap anywhere on video to play/pause
- Top comment pinned as overlay
- Top 3 comments fire as danmaku on every video loop
- Like + comment drawer

**Relax**
- Netflix-style hero banner (blurred video background)
- Card grid with hover scale animation
- Click any card → Watch page

**Watch**
- 16:9 video player
- Live danmaku over 7 fixed horizontal lanes (round-robin)
- Ghost danmaku fires top 3 comments after 5s idle
- WebSocket connection for real-time comments
- Comments panel sorted by upvotes

**Upload**
- Episode upload with title, series name, episode number, creator tier

---

## Key Components

**WakeUp.jsx**  
Checks if backend is alive on load. If backend is sleeping (Render free tier), shows a spinner with rotating micro-drama facts while retrying every 4 seconds. Renders children only when backend responds.

**Navbar.jsx**  
Shared across Shorts, Relax, Upload pages. Receives `page`, `onShorts`, `onRelax`, `onUpload` props from App.jsx.

**constants/api.js**  
```js
const API = import.meta.env.VITE_API_URL || "http://localhost:8000"
export default API
```
Single place to change API URL. All pages import from here.

**styles/common.js**  
Shared style objects for inputs, buttons, cards. Keeps page files clean.

---

## Environment Variables

| Key | Description |
|---|---|
| `VITE_API_URL` | Backend API URL |

Create `.env.development`:
```
VITE_API_URL=http://localhost:8000
```

Create `.env.production`:
```
VITE_API_URL=https://streamsync-apis.onrender.com
```

---

## Local Setup
```bash
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Build & Deploy
```bash
npm run build   # outputs to dist/
```

Deployed on **Vercel**. Auto-deploys on push to `main`.