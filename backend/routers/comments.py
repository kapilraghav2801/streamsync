from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict
import redis.asyncio as aioredis
import json, time, os

router = APIRouter()

# lazy init — don't connect at import time
_redis = None

def get_redis():
    global _redis
    if _redis is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        if redis_url.startswith("rediss://"):
            # parse manually for Python 3.14 compatibility
            parts = redis_url.replace("rediss://", "")
            password = parts.split("@")[0].split(":")[1]
            host = parts.split("@")[1].split(":")[0]
            port = int(parts.split("@")[1].split(":")[1])
            _redis = aioredis.Redis(
                host=host, port=port, password=password,
                ssl=True, decode_responses=True
            )
        else:
            _redis = aioredis.from_url(redis_url, decode_responses=True)
    return _redis

connections: dict = defaultdict(list)

@router.post("/comments/{video_id}")
async def post_comment(video_id: int, payload: dict):
    r = get_redis()
    comment_id = f"{video_id}:{int(time.time()*1000)}"
    comment = {"id": comment_id, "text": payload["text"], "upvotes": 0}
    await r.hset(f"comment:{comment_id}", mapping=comment)
    await r.zadd(f"comments:{video_id}", {comment_id: 0})
    return comment

@router.post("/comments/{video_id}/upvote/{comment_id}")
async def upvote_comment(video_id: int, comment_id: str):
    r = get_redis()
    key = f"comment:{comment_id}"
    await r.hincrby(key, "upvotes", 1)
    upvotes = int(await r.hget(key, "upvotes"))
    await r.zadd(f"comments:{video_id}", {comment_id: upvotes})
    return {"upvotes": upvotes}

@router.get("/comments/{video_id}")
async def get_comments(video_id: int):
    r = get_redis()
    ids = await r.zrevrange(f"comments:{video_id}", 0, -1)
    comments = []
    for cid in ids:
        data = await r.hgetall(f"comment:{cid}")
        if data:
            comments.append({
                "id": cid,
                "text": data["text"],
                "upvotes": int(data["upvotes"])
            })
    return comments

@router.get("/comments/{video_id}/top")
async def get_top_comments(video_id: int):
    r = get_redis()
    ids = await r.zrevrange(f"comments:{video_id}", 0, 2)
    comments = []
    for cid in ids:
        data = await r.hgetall(f"comment:{cid}")
        if data:
            comments.append({
                "id": cid,
                "text": data["text"],
                "upvotes": int(data["upvotes"])
            })
    return comments

@router.websocket("/ws/{video_id}")
async def danmaku_ws(video_id: int, websocket: WebSocket):
    r = get_redis()
    await websocket.accept()
    connections[video_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            comment = {
                "text": payload["text"],
                "timestamp": payload.get("timestamp", 0)
            }
            await r.zadd(
                f"danmu:{video_id}",
                {json.dumps(comment): payload.get("timestamp", 0)}
            )
            for conn in connections[video_id]:
                try:
                    await conn.send_text(json.dumps(comment))
                except:
                    pass
    except WebSocketDisconnect:
        connections[video_id].remove(websocket)