import { useEffect, useRef, useState, forwardRef } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"


const ghostBtn = {
  padding: "10px 24px", background: "transparent",
  color: "#555", border: "1px solid #222", borderRadius: 6,
  cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12
}

export default function Shorts({ onUpload, onGoRelax }) {
  const [videos, setVideos] = useState([])
  const [current, setCurrent] = useState(0)
  const containerRef = useRef(null)
  const videoRefs = useRef([])

  useEffect(() => {
    axios.get(`${API}/videos/feed`).then(r => setVideos(r.data))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown") setCurrent(p => Math.min(p + 1, videos.length - 1))
      if (e.key === "ArrowUp") setCurrent(p => Math.max(p - 1, 0))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [videos])

  useEffect(() => {
    videoRefs.current[current]?.scrollIntoView({ behavior: "smooth" })
    videoRefs.current.forEach((el, i) => {
      if (!el) return
      const vid = el.querySelector("video")
      if (!vid) return
      if (i === current) vid.play().catch(() => {})
      else { vid.pause(); vid.currentTime = 0 }
    })
  }, [current])

  if (videos.length === 0) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", gap: 16 }}>
      <span style={{ fontSize: 48 }}>🎬</span>
      <p style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>no videos yet</p>
      <button onClick={onUpload} style={ghostBtn}>upload first video</button>
    </div>
  )

  return (
    <div style={{ position: "relative", height: "100vh", background: "#000", overflow: "hidden" }}>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)"
      }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>
          STREAMSYNC
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <NavPill label="Shorts" active onClick={() => {}} />
          <NavPill label="Relax" onClick={onGoRelax} />
          <NavPill label="Upload" onClick={onUpload} />
        </div>
      </div>

      <div ref={containerRef} style={{
        height: "100vh", overflowY: "scroll",
        scrollSnapType: "y mandatory", scrollbarWidth: "none"
      }}>
        {videos.map((v, i) => (
          <ShortItem
            key={v.id} video={v} isActive={i === current}
            ref={el => videoRefs.current[i] = el}
            onVisible={() => setCurrent(i)}
          />
        ))}
      </div>

      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        fontFamily: "'Space Mono', monospace", fontSize: 10,
        color: "#333", letterSpacing: 2, pointerEvents: "none"
      }}>↑ ↓ TO NAVIGATE</div>
    </div>
  )
}

function NavPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
      background: active ? "#fff" : "rgba(255,255,255,0.08)",
      color: active ? "#000" : "#aaa",
      fontSize: 12, fontWeight: active ? 700 : 400,
      fontFamily: "'DM Sans', sans-serif"
    }}>{label}</button>
  )
}

const LANES = 6
const DANMU_COLORS = ["#ffffff", "#ffcc44", "#88ddff", "#ffaaaa", "#aaffcc", "#ffddaa"]

const ShortItem = forwardRef(function ShortItem({ video, isActive, onVisible }, ref) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(video.like_count)
  const [topComments, setTopComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [danmuList, setDanmuList] = useState([])
  const laneRef = useRef(0)
  const videoElRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/comments/${video.id}/top`).then(r => setTopComments(r.data))
  }, [])

  // intersection observer to detect when this short is visible
  useEffect(() => {
    const node = typeof ref === "function" ? null : ref?.current
    if (!node) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onVisible()
    }, { threshold: 0.6 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [ref])

  // fire top comments as danmu on every video loop
  useEffect(() => {
    const vid = videoElRef.current
    if (!vid) return

    const onLoop = () => {
      // slight delay so it feels natural after replay starts
      setTimeout(() => fireTopComments(), 800)
    }

    vid.addEventListener("ended", onLoop)
    // also fire once on first play
    const onFirstPlay = () => {
      setTimeout(() => fireTopComments(), 1200)
      vid.removeEventListener("play", onFirstPlay)
    }
    vid.addEventListener("play", onFirstPlay)

    return () => {
      vid.removeEventListener("ended", onLoop)
      vid.removeEventListener("play", onFirstPlay)
    }
  }, [topComments])

  const fireTopComments = () => {
    if (topComments.length === 0) return
    // stagger each comment by 1.2s so they don't all fly at once
    topComments.slice(0, 3).forEach((c, i) => {
      setTimeout(() => {
        const lane = laneRef.current % LANES
        laneRef.current += 1
        const id = Date.now() + Math.random()
        setDanmuList(prev => [...prev, {
          id, text: c.text,
          lane, color: DANMU_COLORS[lane % DANMU_COLORS.length]
        }])
        setTimeout(() => setDanmuList(prev => prev.filter(d => d.id !== id)), 5000)
      }, i * 1200)
    })
  }

  const like = () => {
    if (liked) return
    axios.post(`${API}/videos/${video.id}/like`)
    setLiked(true); setLikes(p => p + 1)
  }

  const sendComment = async () => {
    if (!commentText.trim()) return
    await axios.post(`${API}/comments/${video.id}`, { text: commentText })
    setCommentText("")
    axios.get(`${API}/comments/${video.id}/top`).then(r => setTopComments(r.data))
  }

  const laneHeight = 100 / LANES

  return (
    <div ref={ref} style={{
      height: "100vh", scrollSnapAlign: "start",
      position: "relative", background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <video
        ref={videoElRef}
        src={`${API}/videos/stream/${video.id}`}
        loop controls playsInline
        style={{ height: "100%", maxWidth: "100%", objectFit: "contain" }}
      />

      {/* Gradient */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)"
      }} />

      {/* Danmu overlay */}
      {danmuList.map(d => (
        <div key={d.id} style={{
          position: "absolute",
          top: `${d.lane * laneHeight + laneHeight * 0.15}%`,
          left: "101%",
          color: d.color, fontSize: 14, fontWeight: 600,
          textShadow: "0 1px 6px rgba(0,0,0,0.95)",
          whiteSpace: "nowrap",
          animation: "danmuFly 5s linear forwards",
          pointerEvents: "none", zIndex: 10
        }}>
          {d.text}
        </div>
      ))}

      {/* Bottom info */}
      <div style={{ position: "absolute", bottom: 80, left: 16, right: 72, pointerEvents: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          {video.title}
        </div>
        <div style={{ fontSize: 12, color: "#ccc", marginBottom: 10 }}>
          {video.series_name} · Ep {video.episode_number}
          {video.creator_tier === "new" && <span style={{ marginLeft: 8, color: "#ffcc44", fontSize: 11 }}>✦ New Creator</span>}
        </div>
        {topComments[0] && (
          <div style={{
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
            borderRadius: 20, padding: "6px 14px", display: "inline-flex",
            alignItems: "center", gap: 8, fontSize: 13,
            border: "1px solid rgba(255,255,255,0.1)", pointerEvents: "auto"
          }}>
            <span style={{ fontSize: 11, color: "#ffcc44" }}>🔥</span>
            {topComments[0].text}
            <span style={{ fontSize: 11, color: "#666" }}>· {topComments[0].upvotes} ❤️</span>
          </div>
        )}
      </div>

      {/* Right actions */}
      <div style={{ position: "absolute", right: 10, bottom: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <ActionBtn icon={liked ? "❤️" : "🤍"} label={likes} onClick={like} active={liked} />
        <ActionBtn icon="💬" label={topComments.length} onClick={() => setShowComments(p => !p)} />
        <ActionBtn icon="↗️" label="Share" onClick={() => {}} />
      </div>

      {/* Comment drawer */}
      {showComments && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)",
          borderRadius: "20px 20px 0 0", padding: 20,
          border: "1px solid #1a1a1a", maxHeight: "50vh", overflowY: "auto", zIndex: 20
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#888" }}>Comments</div>
          {topComments.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111" }}>
              <span style={{ fontSize: 13, color: "#ddd" }}>{c.text}</span>
              <span style={{ fontSize: 11, color: "#444" }}>❤️ {c.upvotes}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendComment()}
              placeholder="Add comment..."
              style={{ flex: 1, padding: "9px 14px", background: "#111", border: "1px solid #222", borderRadius: 20, color: "#fff", fontSize: 13, outline: "none" }}
            />
            <button onClick={sendComment} style={{ padding: "9px 16px", background: "#fff", color: "#000", border: "none", borderRadius: 20, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Post</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes danmuFly {
          from { left: 101%; }
          to { left: -400px; }
        }
      `}</style>
    </div>
  )
})

function ActionBtn({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3
    }}>
      <span style={{ fontSize: 26, filter: active ? "drop-shadow(0 0 6px #ff4444)" : "none" }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#ccc", fontWeight: 500 }}>{label}</span>
    </button>
  )
}