import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, MagicMock
from database import Base, get_db
from main import app
import routers.comments as comments_module

TEST_DATABASE_URL = "sqlite:///./test_streamsync.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def mock_redis():
    redis_mock = MagicMock()
    redis_mock.zadd = AsyncMock(return_value=1)
    redis_mock.zrevrange = AsyncMock(return_value=[])
    redis_mock.hset = AsyncMock(return_value=1)
    redis_mock.hgetall = AsyncMock(return_value={})
    redis_mock.hincrby = AsyncMock(return_value=1)
    redis_mock.hget = AsyncMock(return_value="1")
    comments_module.r = redis_mock
    yield redis_mock


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def uploaded_video(client, tmp_path):
    video_file = tmp_path / "test.mp4"
    video_file.write_bytes(b"fake video content")
    with open(video_file, "rb") as f:
        response = client.post("/videos/upload", data={
            "title": "Test Video",
            "series_name": "Test Series",
            "episode_number": "1",
            "creator_tier": "new"
        }, files={"file": ("test.mp4", f, "video/mp4")})
    return response.json()


# Test 1 — fairness algorithm boosts new creators
def test_fairness_algorithm_boosts_new_creators(client):
    """
    New creators get 1.5x boost in feed ranking
    This is StreamSync's core differentiator from YouTube Shorts
    """
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(b"fake video")
        f.seek(0)
        client.post("/videos/upload", data={
            "title": "New Creator Video",
            "series_name": "Series A",
            "episode_number": "1",
            "creator_tier": "new"
        }, files={"file": ("test.mp4", f, "video/mp4")})

    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(b"fake video")
        f.seek(0)
        client.post("/videos/upload", data={
            "title": "Established Creator Video",
            "series_name": "Series B",
            "episode_number": "1",
            "creator_tier": "established"
        }, files={"file": ("test.mp4", f, "video/mp4")})

    response = client.get("/videos/feed")
    assert response.status_code == 200
    feed = response.json()
    assert len(feed) == 2
    assert feed[0]["creator_tier"] == "new"



# Test 2 — video upload returns correct metadata
def test_video_upload_returns_metadata(client):
    """
    Upload endpoint stores title, series, episode correctly
    """
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(b"fake video content")
        f.seek(0)
        response = client.post("/videos/upload", data={
            "title": "Virat Kohli Story",
            "series_name": "Cricket Legends",
            "episode_number": "1",
            "creator_tier": "new"
        }, files={"file": ("kohli.mp4", f, "video/mp4")})

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Virat Kohli Story"


# Test 3 — view count increments correctly
def test_view_count_increments(client):
    """
    Each time a video is opened, view count goes up by 1
    Used in fairness score calculation
    """
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(b"fake video")
        f.seek(0)
        upload = client.post("/videos/upload", data={
            "title": "View Test",
            "series_name": "Test",
            "episode_number": "1",
            "creator_tier": "new"
        }, files={"file": ("test.mp4", f, "video/mp4")})

    video_id = upload.json()["id"]
    client.post(f"/videos/{video_id}/view")
    client.post(f"/videos/{video_id}/view")

    feed = client.get("/videos/feed").json()
    video = next(v for v in feed if v["id"] == video_id)
    assert video["view_count"] == 2


# Test 4 — like count increments correctly
def test_like_count_increments(client):
    """
    Like count is weighted 2x in fairness score
    More likes = higher ranking
    """
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(b"fake video")
        f.seek(0)
        upload = client.post("/videos/upload", data={
            "title": "Like Test",
            "series_name": "Test",
            "episode_number": "1",
            "creator_tier": "established"
        }, files={"file": ("test.mp4", f, "video/mp4")})

    video_id = upload.json()["id"]
    client.post(f"/videos/{video_id}/like")
    client.post(f"/videos/{video_id}/like")

    feed = client.get("/videos/feed").json()
    video = next(v for v in feed if v["id"] == video_id)
    assert video["like_count"] == 2


# Test 5 — feed returns all uploaded videos
def test_feed_returns_all_videos(client):
    """
    Feed endpoint returns all videos
    Sorted by fairness score
    """
    import tempfile
    for i in range(3):
        with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
            f.write(b"fake video")
            f.seek(0)
            client.post("/videos/upload", data={
                "title": f"Video {i}",
                "series_name": "Batch Test",
                "episode_number": str(i + 1),
                "creator_tier": "new"
            }, files={"file": ("test.mp4", f, "video/mp4")})

    response = client.get("/videos/feed")
    assert response.status_code == 200
    assert len(response.json()) == 3
