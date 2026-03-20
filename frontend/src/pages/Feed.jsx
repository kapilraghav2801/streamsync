import { useEffect, useState } from "react"
import axios from "axios"

const API = "http://localhost:8000"

const COLORS = ["#1a3a6b", "#1a4a3a", "#3a1a4a", "#4a2a1a", "#1a3a4a", "#3a3a1a"]

export default function Feed({ onSelect }) {
  const [videos, setVideos] = useState([])

  useEffect(() => {
    axios.get(`${API}/videos/feed?page=0`).then(r => setVideos(r.data))
  }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 20, background: "#4f9eff", borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4f9eff", letterSpacing: 1 }}>
          FOR YOU
        </span>
        <span style={{ fontSize: 11, color: "#1a4a8a", marginLeft: 4 }}>
          · new creators boosted 🚀
        </span>
      </div>

      {videos.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 80, color: "#1a3a6b" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 13 }}>No videos yet. Upload some!</div>
        </div>
      )}

      {/* Shorts-style cards */}
      {videos.map((v, i) => (
        <div key={v.id} onClick={() => onSelect(v)}
          style={{ marginBottom: 16, cursor: "pointer", borderRadius: 16, overflow: "hidden", position: "relative" }}
        >
          {/* Thumbnail area */}
          <div style={{
            width: "100%", height: 220,
            background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, #05080f)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative"
          }}>
            {/* Play button */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(79,158,255,0.15)",
              border: "2px solid rgba(79,158,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20
            }}>▶</div>

            {/* Duration badge */}
            <div style={{
              position: "absolute", bottom: 10, right: 10,
              background: "rgba(0,0,0,0.7)", borderRadius: 6,
              padding: "2px 7px", fontSize: 11, color: "#fff"
            }}>Short</div>

            {/* Creator tier badge */}
            {v.creator_tier === "new" && (
              <div style={{
                position: "absolute", top: 10, left: 10,
                background: "rgba(79,158,255,0.15)",
                border: "1px solid #1a4a8a",
                borderRadius: 8, padding: "2px 8px",
                fontSize: 10, color: "#4f9eff"
              }}>🆕 New Creator</div>
            )}
          </div>

          {/* Info row */}
          <div style={{
            background: "#080e1c", padding: "10px 14px",
            borderTop: "1px solid #0d1f3c"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c8deff" }}>{v.title}</div>
                <div style={{ fontSize: 11, color: "#2a5fa0", marginTop: 2 }}>
                  {v.series_name} · Ep {v.episode_number}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span style={{ fontSize: 11, color: "#334" }}>👁 {v.view_count}</span>
                <span style={{ fontSize: 11, color: "#334" }}>❤️ {v.like_count}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}