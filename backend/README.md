# StreamSync — Backend

FastAPI backend powering the StreamSync video platform.

**Base URL (production):** `https://streamsync-apis.onrender.com`  
**API Docs:** `https://streamsync-apis.onrender.com/docs`

---

## Architecture
```
backend/
├── main.py           # FastAPI app entry point, CORS config
├── database.py       # SQLAlchemy engine, session, Base
├── models.py         # Video model
├── requirements.txt
└── routers/
    ├── videos.py     # Upload, stream, feed, like, view count
    └── comments.py   # Post comment, upvote, top-3, WebSocket
```

---

## API Endpoints

### Videos
| Method | Endpoint | Description |
|---|---|---|
| POST | `/videos/upload` | Upload a new video episode |
| GET | `/videos/feed` | Fairness-ranked video feed |
| GET | `/videos/stream/{id}` | Stream video (redirects to S3) |
| POST | `/videos/{id}/like` | Increment like count |
| POST | `/videos/{id}/view` | Increment view count |

### Comments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/comments/{video_id}` | Post a comment |
| POST | `/comments/{video_id}/upvote/{comment_id}` | Upvote a comment |
| GET | `/comments/{video_id}` | Get all comments sorted by upvotes |
| GET | `/comments/{video_id}/top` | Get top 3 comments only |
| WS | `/ws/{video_id}` | WebSocket for live danmaku |

---

## Key Design Decisions

**Fairness Feed Algorithm**
```python
def score(video):
    boost = 1.5 if video.creator_tier == "new" else 1.0
    return (video.like_count * 2 + video.view_count) * boost
```
New creators get 1.5× ranking boost to counter rich-get-richer dynamics.

**Redis Sorted Sets for Comments**
```
ZADD comments:{video_id} {upvote_count} {comment_id}
ZREVRANGE comments:{video_id} 0 2  → top 3 comments in O(log N)
```

**WebSocket Fan-out**  
In-memory dict maps `video_id → [WebSocket connections]`.  
Each incoming danmaku message broadcasts to all active viewers of that video.

**Lazy Redis Init**  
Redis connection is created on first request, not at import time.  
Prevents startup timeout on Render free tier.

---

## Environment Variables

| Key | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis URL (starts with `rediss://`) |
| `S3_BASE_URL` | AWS S3 base URL for video files |

---

## Local Setup
```bash
pip install -r requirements.txt

# create .env file
DATABASE_URL=sqlite:///./streamsync.db
REDIS_URL=redis://localhost:6379
S3_BASE_URL=

uvicorn main:app --reload
```

---

## Hosting

Deployed on **Render free tier**.  
Note: Service sleeps after 15 minutes of inactivity. First request after sleep takes ~20 seconds to wake up. Frontend handles this with a loading screen.