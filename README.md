# StreamSync

A short-video platform exploring engagement mechanics that YouTube Shorts and Instagram Reels haven't adopted — built with FastAPI, Redis, WebSocket, and React.

---

## Why I built this

While researching why **Bilibili** consistently drives 500K+ comments per video despite having 7× fewer daily users than Douyin, I found the answer wasn't the algorithm — it was **danmaku**: timeline-anchored floating comments that create a ghost co-watching experience.

But danmaku on short video is a bad combination (15–60s isn't enough time to read flying text). So I designed two separate modes around this insight:

- **Scroll mode** — YouTube Shorts-style vertical feed. On every video loop, the **top 3 upvoted comments float across the screen once** — like how viral Instagram pages pin funny comments on reels to drive resharing. Keyboard ↑↓ navigation.
- **Relax mode** — Bilibili/Netflix-style cinematic layout for longer viewing. **Live danmaku flies in real-time lanes** when users are active. When no one has commented for 5 seconds, **ghost danmaku auto-fires** the top 3 comments so the screen never feels dead.

Both modes share the same **fairness-aware feed algorithm** that gives new creators a 1.5× ranking boost — directly addressing the rich-get-richer distribution problem YouTube Shorts has.

---

## Features

**Scroll Mode (Short Video Feed)**
- Fullscreen vertical scroll with scroll-snap and keyboard navigation
- Auto-play/pause on scroll — active video plays, others pause
- Top comment pinned as overlay on every video
- Top 3 comments float across screen on each video loop
- Like, comment, and comment drawer — same UX pattern as YouTube Shorts

**Relax Mode (Bilibili-inspired)**
- Netflix-style hero banner with blurred video background
- Card grid with hover animations
- Live danmaku over 7 fixed horizontal lanes (round-robin assignment — no overlap)
- Ghost danmaku: top 3 comments auto-float after 5s of viewer inactivity
- Ghost comments visually distinct (quoted, 65% opacity) from live comments
- Toggle danmaku ON/OFF per video

**Backend**
- Fairness feed: `score = (likes × 2 + views) × boost` where new creators get 1.5× boost
- Comments ranked by upvotes in Redis Sorted Sets
- WebSocket fan-out for real-time danmaku delivery to all viewers of a video
- Episode management — videos grouped into named series with episode numbers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Python |
| Real-time | WebSocket (FastAPI native) |
| Comment storage | Redis Sorted Sets (score = upvotes) |
| Video & metadata | SQLite + local file storage |
| Frontend | React + Vite |
| HTTP client | Axios |

---

## System Design Decisions

**Why Redis Sorted Sets for comments?**
Comments are stored with upvote count as the score: `ZADD comments:{video_id} {upvotes} {comment_id}`. This gives O(log N) insertion and O(log N + K) retrieval of top-K comments — ideal for a high-read, ranked feed.

**Why WebSocket over polling for danmaku?**
Danmaku requires sub-second delivery to feel live. HTTP polling at 1s intervals would add 0–1000ms latency per comment and hammer the server under load. WebSocket maintains a persistent connection per video room with fan-out to all active viewers.

**Why ghost danmaku?**
A video with no live comments looks dead. Ghost danmaku solves cold-start engagement — the top comments always provide context even for the first viewer, mimicking Bilibili's behavior where a 3-year-old video still feels alive because past comments replay at the same timestamps.

**Fairness algorithm**
Standard recommendation algorithms amplify existing popularity (rich-get-richer). The 1.5× boost for new creators surfaces fresh content before it accumulates views — similar to how Kuaishou (China's #2 short video platform) prioritizes content equity over pure engagement signals.

---

## Running Locally

**Prerequisites:** Python 3.10+, Node.js 18+, Redis
```bash
# 1. Start Redis
redis-server

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Project Structure
```
streamsync/
├── backend/
│   ├── main.py              # FastAPI app + CORS
│   ├── database.py          # SQLite connection + session
│   ├── models.py            # Video model (SQLAlchemy)
│   └── routers/
│       ├── videos.py        # Upload, stream, feed, like, view
│       └── comments.py      # Post, upvote, top-3, WebSocket
└── frontend/
    └── src/
        ├── App.jsx           # Page routing
        └── pages/
            ├── Shorts.jsx    # Scroll mode — vertical feed
            ├── Relax.jsx     # Relax mode — Netflix grid
            ├── Watch.jsx     # Video player — danmaku + comments
            └── Upload.jsx    # Episode upload form
```

---

## What I'd add with more time

- **Thumbnail generation** via FFmpeg on upload (extract frame at 1s)
- **PostgreSQL** replacing SQLite for concurrent write safety
- **Redis pub/sub** replacing in-memory WebSocket connections dict for multi-instance deployment
- **CDN + object storage** (S3) replacing local file storage for video
- **Danmaku density control** — Bilibili caps comments per lane per second to prevent overlap under high load