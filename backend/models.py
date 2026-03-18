from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    series_name = Column(String)        # episode grouping
    episode_number = Column(Integer)
    filename = Column(String)           # stored file name
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    creator_tier = Column(String, default="new")  # "new" or "established"
    uploaded_at = Column(DateTime, default=datetime.utcnow)
