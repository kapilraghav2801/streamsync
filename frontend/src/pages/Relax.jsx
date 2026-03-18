import { useEffect, useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"


export default function Relax({ onSelect, onGoShorts, onUpload }) {
  const [videos, setVideos] = useState([])
  const [featured, setFeatured] = useState(null)

  useEffect(() => {
    axios.get(`${API}/videos/feed`).then(r => {
      setVideos(r.data)
      if (r.data.length > 0) setFeatured(r.data[0])
    })
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 40px", position: "sticky", top: 0, zIndex: 100,
        background: "rgba(13,13,13,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a"
      }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "#e8e8e8" }}>
          STREAMSYNC
        </span>
        <div style={{ display: "flex", gap: 32, fontSize: 14, color: "#666" }}>
          <span onClick={onGoShorts} style={{ cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#fff"}
            onMouseLeave={e => e.target.style.color = "#666"}>Shorts</span>
          <span style={{ color: "#fff", fontWeight: 600 }}>Relax</span>
          <span onClick={onUpload} style={{ cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={e => e.target.style.color = "#fff"}
            onMouseLeave={e => e.target.style.color = "#666"}>Upload</span>
        </div>
      </nav>

      {/* Hero — featured video */}
      {featured && (
        <div style={{
          position: "relative", height: 420, overflow: "hidden",
          display: "flex", alignItems: "flex-end"
        }}>
          <video
            src={`${API}/videos/stream/${featured.id}`}
            muted autoPlay loop playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, rgba(13,13,13,0.95) 30%, transparent 70%), linear-gradient(to top, #0d0d0d 0%, transparent 50%)"
          }} />
          <div style={{ position: "relative", padding: "0 40px 48px" }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#888", marginBottom: 10, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
              Featured · {featured.series_name}
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.1, marginBottom: 16, maxWidth: 500 }}>
              {featured.title}
            </h1>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => onSelect(featured)} style={{
                padding: "11px 28px", background: "#fff", color: "#000",
                border: "none", borderRadius: 6, fontWeight: 700, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8
              }}>▶ Watch Now</button>
              <button style={{
                padding: "11px 22px", background: "rgba(255,255,255,0.1)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, fontSize: 14,
                cursor: "pointer", backdropFilter: "blur(4px)"
              }}>+ Watchlist</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ padding: "32px 40px" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", marginBottom: 20, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
          All Episodes · Fairness Ranked
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16
        }}>
          {videos.map((v, i) => (
            <VideoCard key={v.id} video={v} onClick={() => onSelect(v)} featured={i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function VideoCard({ video, onClick, featured }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        transform: hovered ? "scale(1.04)" : "scale(1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.6)" : "none",
        position: "relative"
      }}
    >
      {/* Thumbnail */}
      <div style={{
        aspectRatio: "16/9", background: "#181818",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden"
      }}>
        <span style={{ fontSize: 36, opacity: 0.3 }}>▶</span>
        {hovered && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: 28 }}>▶</span>
          </div>
        )}
        {featured && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: "#e50914", color: "#fff",
            fontSize: 9, fontWeight: 700, padding: "3px 7px",
            borderRadius: 3, letterSpacing: 1, fontFamily: "'Space Mono', monospace"
          }}>TOP</div>
        )}
        {video.creator_tier === "new" && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(255,204,68,0.15)", color: "#ffcc44",
            fontSize: 9, fontWeight: 700, padding: "3px 7px",
            borderRadius: 3, letterSpacing: 1, border: "1px solid rgba(255,204,68,0.3)"
          }}>NEW</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px", background: "#141414" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8e8", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {video.title}
        </div>
        <div style={{ fontSize: 11, color: "#555" }}>
          {video.series_name} · Ep {video.episode_number}
        </div>
        <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
          👁 {video.view_count} · ❤️ {video.like_count}
        </div>
      </div>
    </div>
  )
}

const ghostBtn = {
  padding: "10px 24px", background: "transparent",
  color: "#555", border: "1px solid #222", borderRadius: 6,
  cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12
}