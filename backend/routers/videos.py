from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import update, desc, case
from database import get_db
from models import Video

import aiofiles, os, uuid


router = APIRouter(prefix="/videos", tags=["videos"])

S3_BASE = os.getenv("S3_BASE_URL", "")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_video(
    title: str = Form(...),
    series_name: str = Form(...),
    episode_number: int = Form(...),
    creator_tier: str = Form("new"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if S3_BASE:
        filename = f"{S3_BASE}/{file.filename}"
    else:
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # chunked, not file.read()
                await f.write(chunk)

    video = Video(
        title=title, series_name=series_name,
        episode_number=episode_number, creator_tier=creator_tier,
        filename=filename
    )
    db.add(video); db.commit(); db.refresh(video)
    return {"id": video.id, "title": video.title, "filename": video.filename}


@router.get("/stream/{video_id}")
def stream_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.filename.startswith("http"):
        return RedirectResponse(url=video.filename)
    path = os.path.join(UPLOAD_DIR, video.filename)
    return FileResponse(path, media_type="video/mp4")


@router.get("/feed")
def get_feed(page: int = 0, db: Session = Depends(get_db)):
    # build the score expression inside PostgreSQL, not Python
    boost = case((Video.creator_tier == "new", 1.5), else_=1.0)
    score_expr = (Video.like_count * 2 + Video.view_count) * boost

    videos = (
        db.query(Video)
        .order_by(desc(score_expr))   # DB sorts
        .limit(10)                    # DB takes only 10
        .offset(page * 10)            # DB skips previous pages
        .all()
    )

    return [
        {
            "id": v.id, "title": v.title,
            "series_name": v.series_name,
            "episode_number": v.episode_number,
            "view_count": v.view_count,
            "like_count": v.like_count,
            "creator_tier": v.creator_tier,
        }
        for v in videos
    ]



@router.post("/{video_id}/like")
def like_video(video_id: int, db: Session = Depends(get_db)):
    result = db.execute(                  # no pre-fetch — fire SQL directly
        update(Video)
        .where(Video.id == video_id)      # video_id from URL, not video.id
        .values(like_count=Video.like_count + 1)
    )
    if result.rowcount == 0:             # rowcount=0 means no row matched → 404
        raise HTTPException(status_code=404, detail="Video not found")
    db.commit()
    video = db.query(Video).filter(Video.id == video_id).first()
    return {"likes": video.like_count}


@router.post("/{video_id}/view")
def increment_view(video_id: int, db: Session = Depends(get_db)):
    result = db.execute(
        update(Video)
        .where(Video.id == video_id)      # same fix here
        .values(view_count=Video.view_count + 1)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    db.commit()
    video = db.query(Video).filter(Video.id == video_id).first()
    return {"views": video.view_count}
