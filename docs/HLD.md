# StreamSync — High Level Design

## Problem Statement

YouTube Shorts drives 200B+ daily views but has near-zero 
in-video community engagement. Bilibili (China) solved this 
with danmaku — real-time comments that float across the video 
as an overlay. StreamSync brings this to a short-video platform 
with a fairness-aware feed algorithm that prevents rich-get-richer 
content monopolization.

---

## Scale Targets (Design Exercise)

| Metric | Target |
|---|---|
| Concurrent viewers | 10,000 |
| Videos in feed | 1M+ |
| Comments per video per minute | 500 |
| Feed API latency | < 200ms |
| WebSocket fan-out latency | < 100ms |

---

## High Level Architecture
```
                    ┌─────────────────┐
                    │   Client        │
                    │ (React + Vite)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Vercel CDN    │
                    │  (Static Files) │
                    └────────┬────────┘
                             │
               ┌─────────────▼──────────────┐
               │        FastAPI              │
               │     (Render.com)            │
               │                            │
               │  /videos/feed    ──────────┼──► PostgreSQL
               │  /videos/upload  ──────────┼──► AWS S3
               │  /comments/ws    ──────────┼──► Redis
               └────────────────────────────┘
                         │          │
               ┌─────────▼──┐  ┌───▼──────────┐
               │ PostgreSQL  │  │   Redis       │
               │ (Supabase)  │  │  (Upstash)    │
               └─────────────┘  └──────────────┘
```

---

## Core Components

### 1. Feed Service
Serves the video feed ranked by fairness score.
```
score = (likes × 2 + views) × boost

where boost:
  new creator    → 1.5×
  established    → 1.0×
```

Why this matters: Standard feeds use engagement signals alone,
which causes rich-get-richer loops where already-popular videos
dominate. The 1.5× boost for new creators mirrors Kuaishou's
approach to democratize content discovery — a direct contrast
to YouTube Shorts' pure engagement ranking.

### 2. Video Storage
Videos uploaded to AWS S3. FastAPI stores only the S3 URL
in PostgreSQL, not the video itself. Feed API returns S3 URLs
directly — client streams video from S3, not through the API server.
```
Upload flow:
Client → FastAPI → S3 (video file)
                → PostgreSQL (metadata + S3 URL)

Stream flow:
Client → FastAPI → redirect to S3 URL
Client → S3 (direct streaming)
```

This keeps the API server stateless and prevents it from becoming
a video streaming bottleneck.

### 3. Comment System
Two modes of comment display:

**Scroll mode:** Top comment pinned as overlay. Top 3 comments
fire as danmaku on every video loop.

**Relax mode:** Live danmaku over 7 fixed horizontal lanes
using round-robin assignment. Ghost danmaku fires top 3 comments
after 5 seconds of idle — solves the cold-start problem for
new videos.

### 4. WebSocket Fan-out
```
New comment posted
    │
    ▼
POST /comments/{video_id}
    │
    ├── Save to PostgreSQL
    ├── ZADD to Redis Sorted Set (score = upvotes)
    └── Publish to Redis channel: comments:{video_id}
              │
              ▼
    All WebSocket subscribers receive
              │
              ▼
    Danmaku fires on all connected clients < 100ms
```

---

## Data Model (High Level)
```
Video
├── id, title, series_name, episode_number
├── s3_url, creator_tier
├── view_count, like_count
└── uploaded_at

Comment
├── id, video_id, text, upvotes
└── created_at
```

---

## Key Tradeoffs

### Why not HLS/DASH streaming?
For a portfolio project serving MP4 files under 100MB,
direct S3 streaming is sufficient. At YouTube scale, HLS with
adaptive bitrate would be required — the server would transcode
uploads into multiple quality levels and serve segments.

### Why Redis Sorted Sets for comments?
Top comments endpoint needs the highest-upvoted comments instantly.
ZREVRANGE with score returns them in O(log N). Alternative — 
querying PostgreSQL with ORDER BY upvotes — would work but adds
database load on every video loop.

### Why 7 fixed danmaku lanes?
Prevents comment collision. Round-robin assignment ensures
even distribution across lanes. Alternative — random lane 
assignment — causes clustering and overlapping text.

---

## What production would add

- CDN for video delivery (CloudFront in front of S3)
- HLS transcoding pipeline (FFmpeg + AWS MediaConvert)
- Horizontal WebSocket scaling (multiple servers via Redis Pub/Sub)
- Rate limiting on comments per user per minute
- Video moderation pipeline before S3 upload