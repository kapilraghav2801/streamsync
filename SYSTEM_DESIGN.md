# StreamSync — System Design

## Decisions and tradeoffs

### Why Redis Sorted Sets for comment ranking?
Comments are stored as `ZADD comments:{video_id} {upvotes} {comment_id}`.
This gives O(log N) insert and O(log N + K) retrieval of top-K comments.

A plain SQL `ORDER BY upvotes DESC LIMIT 3` would also work at small scale,
but sorted sets let the danmaku layer fetch top comments without hitting
PostgreSQL on every WebSocket message — important when a popular video has
hundreds of concurrent viewers all triggering ghost danmaku.

### Why WebSocket over HTTP polling for danmaku?
HTTP polling adds 0–1000ms latency depending on poll interval, and hammers
the server with requests even when nothing is happening.

WebSocket maintains one persistent connection per viewer. When a comment
arrives, the server fans it out to all active connections in that video's
"room" — sub-100ms delivery with no wasted requests.

### Why a fairness boost for new creators?
`score = (likes × 2 + views) × boost`

New creators get 1.5×. Without this, feed algorithms amplify whoever is
already popular — new creators never get initial distribution regardless
of content quality. Kuaishou uses a similar mechanism. The score is
computed at the DB level (`CASE WHEN creator_tier = 'new' THEN 1.5 ELSE 1.0`)
so sorting and pagination happen entirely in PostgreSQL, not Python.

### Why atomic DB updates for like/view counts?
`UPDATE videos SET like_count = like_count + 1 WHERE id = ?`

A read-modify-write in Python (`video.like_count += 1`) is a race condition
— two concurrent requests both read the same value and one write is silently
lost. Pushing the increment into a single SQL statement makes it atomic at
the database level.

### Why ghost danmaku?
Cold-start problem. A video with zero live viewers looks dead — no comments
floating across. Ghost danmaku fires the top 3 upvoted comments automatically
after 5 seconds of viewer inactivity, so every video feels alive even for
the very first viewer.

---

## Known limitations and production path

| Current | Why it's limited | Production fix |
|---|---|---|
| WebSocket manager is in-memory | Doesn't work across multiple server instances | Replace with Redis Pub/Sub — each server subscribes to `danmaku:{video_id}`, publish fans out across all servers |
| Feed score not time-decayed | Old viral videos stay at top forever | Add decay: `score / (age_hours + 2) ^ 1.5` (Hacker News-style) |
| `create_all` on startup | Dangerous in production, no migration history | Replace with Alembic migrations |
| No auth | Any user can like/upload | JWT with refresh tokens |
| S3 upload via backend | Large files pass through server RAM | Presigned S3 URLs — client uploads directly to S3, backend never touches the bytes |
