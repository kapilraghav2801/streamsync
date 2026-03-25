# StreamSync — Low Level Design

## Component Deep Dives

---

## 1. Fairness Feed Algorithm
```python
def calculate_score(video: Video) -> float:
    base_score = (video.like_count * 2) + video.view_count
    boost = 1.5 if video.creator_tier == "new" else 1.0
    return base_score * boost

def get_feed(db: Session) -> list[Video]:
    videos = db.query(Video).all()
    return sorted(videos, key=calculate_score, reverse=True)
```

**Why likes weighted 2×:** Likes require active intent — a user
chose to engage. Views are passive. This prevents viral accidents
(a video seen by millions but actively disliked) from dominating
the feed.

**Interview question:** "How would you scale this to 1M videos?"

Answer: Pre-compute scores in a background job every 5 minutes.
Store in Redis Sorted Set — ZADD feed:scores {score} {video_id}.
Feed endpoint becomes ZREVRANGE feed:scores 0 19 — O(log N),
no database query needed.

---

## 2. WebSocket Comment Fan-out
```python
# Connection registry — in-memory per server instance
active_connections: dict[str, list[WebSocket]] = {}

async def connect(video_id: str, ws: WebSocket):
    await ws.accept()
    active_connections.setdefault(video_id, []).append(ws)
    
    # Hydrate new client with current top 3
    top = await get_top_comments(video_id)
    await ws.send_json({"type": "init", "comments": top})

async def broadcast(video_id: str, message: dict):
    dead = []
    for ws in active_connections.get(video_id, []):
        try:
            await ws.send_json(message)
        except:
            dead.append(ws)
    # Deferred removal — never modify list during iteration
    for ws in dead:
        active_connections[video_id].remove(ws)
```

**Stale closure bug (fixed):** The original WebSocket `onmessage`
handler in React captured a stale reference to the comments state.
Fixed by inlining the state update inside the handler instead of
referencing the outer state variable.

**Horizontal scaling problem:** This in-memory registry only works
on a single server. With multiple instances, a comment posted to
server A never reaches clients connected to server B.

**Solution at scale:** Redis Pub/Sub. Every server subscribes to
the same channel. When any server receives a comment, it publishes
to Redis. All servers receive and broadcast to their local clients.

---

## 3. Redis Comment Ranking
```python
# Post comment — store in DB + Redis
async def post_comment(video_id: int, text: str, db: Session):
    comment = Comment(video_id=video_id, text=text)
    db.add(comment)
    db.commit()
    
    # Add to sorted set with score 0 (upvotes start at 0)
    await r.zadd(f"comments:{video_id}", {str(comment.id): 0})
    return comment

# Upvote — atomic increment
async def upvote(video_id: int, comment_id: int):
    await r.zincrby(f"comments:{video_id}", 1, str(comment_id))

# Get top 3
async def get_top_comments(video_id: int) -> list:
    top_ids = await r.zrevrange(
        f"comments:{video_id}", 0, 2, withscores=True
    )
    return top_ids
```

**Why atomic ZINCRBY matters:** Two concurrent upvotes on the same
comment could both read score=5, both write score=6, resulting in
score=6 instead of 7. ZINCRBY is atomic — Redis processes it as a
single operation, so both increments are guaranteed to apply.

---

## 4. Ghost Danmaku (Cold Start Solution)
```javascript
// After 5 seconds of no new comments, fire top 3 as ghost danmaku
useEffect(() => {
  let idleTimer

  const resetTimer = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      if (topComments.length > 0) {
        fireGhostDanmaku(topComments.slice(0, 3))
      }
    }, 5000)
  }

  ws.current.onmessage = (e) => {
    const data = JSON.parse(e.data)
    fireDanmaku(data)
    resetTimer()
  }

  resetTimer()
  return () => clearTimeout(idleTimer)
}, [topComments])
```

**Problem it solves:** New videos have zero comments. Without ghost
danmaku, the video plays in silence with no floating text, making
it feel empty compared to Bilibili. Ghost danmaku makes every video
feel alive even before community engagement builds.

---

## 5. S3 Video Streaming
```python
@router.get("/stream/{video_id}")
async def stream_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404)
    
    # Redirect client directly to S3 — server never touches the bytes
    return RedirectResponse(url=video.s3_url)
```

**Why redirect not proxy:** If the server proxied the video bytes,
every concurrent viewer would consume server bandwidth and memory.
At 100 concurrent viewers watching 10MB videos, that's 1GB of
memory just for video buffering. S3 redirect offloads streaming
entirely to AWS infrastructure.

---

## Database Schema
```sql
CREATE TABLE videos (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    series_name VARCHAR(255),
    episode_number INTEGER,
    s3_url      TEXT NOT NULL,
    creator_tier VARCHAR(20) DEFAULT 'new',
    view_count  INTEGER DEFAULT 0,
    like_count  INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id         SERIAL PRIMARY KEY,
    video_id   INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    text       VARCHAR(500) NOT NULL,
    upvotes    INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/videos/feed` | Fairness-ranked video feed |
| POST | `/videos/upload` | Upload video to S3 + save metadata |
| GET | `/videos/stream/{id}` | Redirect to S3 URL |
| POST | `/videos/{id}/view` | Increment view count |
| POST | `/videos/{id}/like` | Increment like count |
| POST | `/comments/{video_id}` | Post comment |
| POST | `/comments/{video_id}/{comment_id}/upvote` | Upvote comment |
| GET | `/comments/{video_id}/top` | Get top 3 comments |
| WS | `/ws/{video_id}` | WebSocket danmaku stream |

---

## Interview Whiteboard Summary

When asked to design StreamSync in an interview, hit these points:

1. **Feed** — fairness score prevents rich-get-richer, pre-compute
   at scale with Redis Sorted Set

2. **Video storage** — S3 for files, PostgreSQL for metadata,
   API redirects to S3 (never proxies bytes)

3. **Comments** — Redis Sorted Set for O(log N) top comment
   retrieval, atomic ZINCRBY for race-condition-free upvotes

4. **Real-time** — WebSocket fan-out, ghost danmaku solves
   cold start, Redis Pub/Sub for horizontal scaling

5. **Danmaku lanes** — 7 fixed lanes, round-robin assignment
   prevents collision