from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict
from typing import List
import redis.asyncio as aioredis
import json, time, os

router = APIRouter()
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
r = aioredis.Redis(
    host=redis_url.split("@")[1].split(":")[0],
    port=int(redis_url.split("@")[1].split(":")[1]),
    password=redis_url.split(":")[2].split("@")[0],
    ssl=redis_url.startswith("rediss"),
    decode_responses=True
)


connections: dict = defaultdict(list)

@router.post("/comments/{video_id}")
async def post_comment(video_id: int, payload: dict):
    comment_id = f"{video_id}:{int(time.time()*1000)}"
    comment = {"id": comment_id, "text": payload["text"], "upvotes": 0}
    await r.hset(f"comment:{comment_id}", mapping=comment)
    await r.zadd(f"comments:{video_id}", {comment_id: 0})
    return comment

@router.post("/comments/{video_id}/upvote/{comment_id}")
async def upvote_comment(video_id: int, comment_id: str):
    key = f"comment:{comment_id}"
    await r.hincrby(key, "upvotes", 1)
    upvotes = int(await r.hget(key, "upvotes"))
    await r.zadd(f"comments:{video_id}", {comment_id: upvotes})
    return {"upvotes": upvotes}

@router.get("/comments/{video_id}")
async def get_comments(video_id: int):
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
