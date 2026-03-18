import { useEffect, useRef, useState } from "react"
import axios from "axios"
import API from "../constants/api"

const LANES = 7
const DANMU_COLORS = ["#fff", "#ffcc44", "#88ddff", "#ffaaaa", "#aaffcc", "#ffddaa", "#ccaaff"]
const GHOST_IDLE_MS = 5000  // fire ghost danmu after 5s of silence

export default function Watch({ video, onBack }) {
  const [comments, setComments] = useState([])
  const [topComments, setTopComments] = useState([])
  const [danmuList, setDanmuList] = useState([])
  const [text, setText] = useState("")
  const [liked, setLiked] = useState(false)
  const [showDanmu, setShowDanmu] = useState(true)
  const videoRef = useRef(null)
  const wsRef = useRef(null)
  const laneRef = useRef(0)
  const lastLiveRef = useRef(Date.now())  // tracks last live comment time
  const idleTimerRef = useRef(null)       // ghost danmu idle timer
  const topCommentsRef = useRef([])       // always fresh ref for timers

  // keep ref in sync with state
  useEffect(() => { topCommentsRef.current = topComments }, [topComments])

  const fetchComments = () => {
    axios.get(`${API}/comments/${video.id}`).then(r => setComments(r.data))
    axios.get(`${API}/comments/${video.id}/top`).then(r => setTopComments(r.data))
  }

  const fireDanmu = (text, isGhost = false) => {
    const lane = laneRef.current % LANES
    laneRef.current += 1
    const id = Date.now() + Math.random()
    const color = isGhost
      ? `rgba(${DANMU_COLORS[lane % DANMU_COLORS.length]}, 0.5)`  // ghosts slightly faded
      : DANMU_COLORS[lane % DANMU_COLORS.length]
    setDanmuList(prev => [...prev, { id, text, lane, color, isGhost }])
    setTimeout(() => setDanmuList(prev => prev.filter(d => d.id !== id)), 5500)
  }

  // ghost danmu — fires top 3 staggered when idle
  const fireGhostDanmu = () => {
    const top = topCommentsRef.current
    if (top.length === 0) return
    top.slice(0, 3).forEach((c, i) => {
      setTimeout(() => fireDanmu(c.text, true), i * 1500)
    })
  }

  // reset idle timer every time a live comment comes in
  const resetIdleTimer = () => {
    lastLiveRef.current = Date.now()
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(fireGhostDanmu, GHOST_IDLE_MS)
  }

  useEffect(() => {
    axios.post(`${API}/videos/${video.id}/view`)
    fetchComments()

    const ws = new WebSocket(`ws://localhost:8000/ws/${video.id}`)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      fireDanmu(msg.text, false)
      resetIdleTimer()
    }
    wsRef.current = ws

    // start idle timer immediately — fires ghost on first load after 5s
    idleTimerRef.current = setTimeout(fireGhostDanmu, GHOST_IDLE_MS)

    // also fire ghost danmu on every video loop
    const vid = videoRef.current
    const onLoop = () => setTimeout(fireGhostDanmu, 800)
    vid?.addEventListener("ended", onLoop)

    return () => {
      ws.close()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      vid?.removeEventListener("ended", onLoop)
    }
  }, [video])

  const sendComment = async () => {
    if (!text.trim()) return
    await axios.post(`${API}/comments/${video.id}`, { text })
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ text, timestamp: videoRef.current?.currentTime || 0 }))
    }
    setText("")
    fetchComments()
    resetIdleTimer()
  }

  const upvote = async (id) => {
    await axios.post(`${API}/comments/${video.id}/upvote/${encodeURIComponent(id)}`)
    fetchComments()
  }

  const laneHeight = 100 / LANES

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>

      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "16px 28px",
        borderBottom: "1px solid #1a1a1a", position: "sticky", top: 0,
        background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", zIndex: 50
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "#555",
          cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0
        }}>←</button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2, color: "#444" }}>
          {video.series_name.toUpperCase()} · EP {video.episode_number}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28 }}>

          {/* Left — video */}
          <div>
            <div style={{
              position: "relative", background: "#000",
              borderRadius: 12, overflow: "hidden", aspectRatio: "16/9"
            }}>
              <video
                ref={videoRef}
                src={`${API}/videos/stream/${video.id}`}
                controls
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />

              {/* Danmu lanes */}
              {showDanmu && danmuList.map(d => (
                <div key={d.id} style={{
                  position: "absolute",
                  top: `${d.lane * laneHeight + laneHeight * 0.1}%`,
                  left: "101%",
                  color: d.color,
                  fontSize: d.isGhost ? 13 : 15,
                  fontWeight: 600,
                  opacity: d.isGhost ? 0.65 : 1,   // ghosts slightly transparent
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                  whiteSpace: "nowrap",
                  animation: "danmuFly 5.5s linear forwards",
                  pointerEvents: "none", zIndex: 10,
                  letterSpacing: d.isGhost ? 0.3 : 0.5
                }}>
                  {d.isGhost ? `"${d.text}"` : d.text}
                </div>
              ))}

              {/* Toggle + idle hint */}
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                <button onClick={() => setShowDanmu(p => !p)} style={{
                  background: "rgba(0,0,0,0.6)", border: "1px solid #333",
                  color: showDanmu ? "#ffcc44" : "#555",
                  fontSize: 11, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                  fontFamily: "'Space Mono', monospace", letterSpacing: 1
                }}>
                  {showDanmu ? "💬 Live ON" : "💬 Live OFF"}
                </button>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{video.title}</h2>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
                {video.series_name} · Episode {video.episode_number} ·
                <span style={{ marginLeft: 6, color: video.creator_tier === "new" ? "#ffcc44" : "#444" }}>
                  {video.creator_tier === "new" ? "✦ New Creator" : "⭐ Established"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>
                idle 5s → ghost comments float · someone types → live comments fly
              </div>
              <button onClick={() => { if (!liked) { axios.post(`${API}/videos/${video.id}/like`); setLiked(true) } }} style={{
                padding: "8px 20px",
                background: liked ? "rgba(255,68,68,0.15)" : "transparent",
                color: liked ? "#ff4444" : "#555",
                border: "1px solid " + (liked ? "#ff444444" : "#222"),
                borderRadius: 6, cursor: liked ? "default" : "pointer", fontSize: 13
              }}>
                {liked ? "❤️ Liked" : "🤍 Like"}
              </button>
            </div>

            {/* Input */}
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <input
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendComment()}
                placeholder="Send a danmu comment..."
                style={{
                  flex: 1, padding: "10px 16px",
                  background: "#111", border: "1px solid #1e1e1e",
                  borderRadius: 6, color: "#e8e8e8", fontSize: 13, outline: "none"
                }}
              />
              <button onClick={sendComment} style={{
                padding: "10px 18px", background: "#e8e8e8", color: "#000",
                border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13
              }}>Post</button>
            </div>
          </div>

          {/* Right — comments */}
          <div>
            <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, color: "#444", marginBottom: 16 }}>
              COMMENTS · {comments.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {comments.length === 0 && <p style={{ color: "#333", fontSize: 13 }}>No comments yet.</p>}
              {comments.map((c, i) => (
                <div key={c.id} style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: i === 0 ? "#161616" : "transparent",
                  border: "1px solid " + (i === 0 ? "#222" : "transparent")
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 13, color: i === 0 ? "#e8e8e8" : "#666", flex: 1, lineHeight: 1.5 }}>
                      {i === 0 && <span style={{ fontSize: 9, color: "#ff4444", marginRight: 6, fontWeight: 700, letterSpacing: 1 }}>TOP</span>}
                      {c.text}
                    </div>
                    <button onClick={() => upvote(c.id)} style={{
                      background: "none", border: "none", color: "#444",
                      cursor: "pointer", fontSize: 12, marginLeft: 8, padding: 0
                    }}>❤️ {c.upvotes}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes danmuFly {
          from { left: 101%; }
          to { left: -500px; }
        }
      `}</style>
    </div>
  )
}