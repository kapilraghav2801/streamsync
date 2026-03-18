from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session
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
            content = await file.read()
            await f.write(content)

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
    if video.filename.startswith("http"):
        return RedirectResponse(url=video.filename)
    path = os.path.join(UPLOAD_DIR, video.filename)
    return FileResponse(path, media_type="video/mp4")

@router.get("/feed")
def get_feed(db: Session = Depends(get_db)):
    videos = db.query(Video).all()
    def score(v):
        boost = 1.5 if v.creator_tier == "new" else 1.0
        return (v.like_count * 2 + v.view_count) * boost
    sorted_videos = sorted(videos, key=score, reverse=True)
    return [
        {
            "id": v.id, "title": v.title,
            "series_name": v.series_name,
            "episode_number": v.episode_number,
            "view_count": v.view_count,
            "like_count": v.like_count,
            "creator_tier": v.creator_tier,
        }
        for v in sorted_videos
    ]

@router.post("/{video_id}/like")
def like_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    video.like_count += 1; db.commit()
    return {"likes": video.like_count}

@router.post("/{video_id}/view")
def increment_view(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    video.view_count += 1; db.commit()
    return {"views": video.view_count}
