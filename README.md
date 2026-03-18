# StreamSync

A short-video platform exploring engagement mechanics that YouTube Shorts and Instagram Reels haven't adopted.

🔗 **Live Demo:** [streamsync.kapilraghav.info](https://kapilraghav.info/streamsync)  

---

## The Insight

In 2024, China's micro-drama market hit **$6.9 billion** — surpassing the entire Chinese box office for the first time. 576 million people watch short serial dramas (90-second episodes, cliffhanger every minute). Nobody wants to commit 40–70 minutes to a TV episode anymore.

YouTube Shorts and Instagram Reels have the distribution. They don't have:
- **Series + episode structure** that makes micro-dramas addictive
- **Danmaku (弹幕)** — Bilibili's floating comment system that drives 500K+ comments per video
- **Fairness-aware feed** — Kuaishou boosts new creators instead of amplifying only viral content

StreamSync is built around these three gaps.

---

## Two Modes

**Scroll Mode** — YouTube Shorts style
- Fullscreen vertical feed with keyboard ↑↓ navigation
- Tap anywhere to play/pause
- Top comment pinned as overlay on every video
- Top 3 upvoted comments float across screen on each video loop (danmaku-style)

**Relax Mode** — Bilibili/Netflix style
- Netflix-style hero banner with blurred video background
- Card grid with hover animations
- Live danmaku flies across 7 fixed horizontal lanes (round-robin, no overlap)
- Ghost danmaku: top 3 comments auto-float after 5 seconds of viewer inactivity
- Toggle danmaku ON/OFF per video

---

## System Design Highlights

**Why Redis Sorted Sets for comments?**  
Comments stored with upvote count as score: `ZADD comments:{video_id} {upvotes} {comment_id}`.  
O(log N) insert, O(log N + K) retrieval of top-K comments.

**Why WebSocket over polling for danmaku?**  
HTTP polling adds 0–1000ms latency per comment. WebSocket maintains persistent connection per video room with fan-out to all active viewers — sub-100ms delivery.

**Why ghost danmaku?**  
Cold-start problem — a video with zero live comments looks dead. Ghost danmaku fires top 3 comments automatically after 5s idle, so every video feels alive even for the first viewer.

**Fairness algorithm**  
`score = (likes × 2 + views) × boost`  
New creators get 1.5× boost — directly addressing YouTube Shorts' rich-get-richer distribution problem.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python) |
| Real-time danmaku | WebSocket (FastAPI native) |
| Comment ranking | Redis Sorted Sets (Upstash) |
| Database | PostgreSQL (Supabase) |
| Video storage | AWS S3 |
| Frontend | React + Vite |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## Project Structure
```
streamsync/
├── backend/          # FastAPI — see backend/README.md
└── frontend/         # React + Vite — see frontend/README.md
```

---

## Local Development
```bash
# 1. Start Redis
redis-server

# 2. Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`

---

Built by [Kapil Raghav](https://kapilraghav.info)