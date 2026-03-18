import { useEffect, useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"


const facts = [
  "In 2024, China's micro-drama market hit $6.9B — beating the entire Chinese box office.",
  "576 million people in China watch short serial dramas. That's more than the EU's population.",
  "Episodes are 90 seconds. Cliffhanger every minute. Nobody commits to 40-min TV anymore.",
  "ReelShort, a Chinese micro-drama app, hit #1 on US Apple App Store in March 2024.",
  "50%+ of micro-drama viewers in China pay to unlock the next episode. Every. 90. Seconds.",
]

export default function WakeUp({ children }) {
  const [status, setStatus] = useState("checking") // checking | waking | ready
  const [factIndex, setFactIndex] = useState(0)

  useEffect(() => {
    let factTimer
    const check = async () => {
      try {
        await axios.get(`${API}/videos/feed`, { timeout: 3000 })
        setStatus("ready")
      } catch {
        setStatus("waking")
        // rotate facts every 3s while waiting
        factTimer = setInterval(() => {
          setFactIndex(p => (p + 1) % facts.length)
        }, 3000)
        // retry every 4s
        const retry = setInterval(async () => {
          try {
            await axios.get(`${API}/videos/feed`, { timeout: 4000 })
            setStatus("ready")
            clearInterval(retry)
            clearInterval(factTimer)
          } catch {}
        }, 4000)
      }
    }
    check()
    return () => clearInterval(factTimer)
  }, [])

  if (status === "ready") return children

  return (
    <div style={{
      height: "100vh", background: "#0a0a0a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 32
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 18, fontWeight: 700, letterSpacing: 3,
        color: "#e8e8e8", marginBottom: 48
      }}>
        STREAMSYNC
      </div>

      {/* Spinner */}
      <div style={{
        width: 36, height: 36,
        border: "2px solid #1a1a1a",
        borderTop: "2px solid #e8e8e8",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        marginBottom: 28
      }} />

      {/* Status */}
      {status === "checking" && (
        <p style={{ color: "#444", fontSize: 13, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
          connecting...
        </p>
      )}

      {status === "waking" && (
        <>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 6, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
            backend waking up · free tier · ~20s
          </p>
          <p style={{ color: "#333", fontSize: 11, marginBottom: 40, fontFamily: "'Space Mono', monospace" }}>
            (Render.com free tier sleeps after 15min inactivity)
          </p>

          {/* Rotating micro-drama fact */}
          <div style={{
            maxWidth: 480, padding: "20px 28px",
            border: "1px solid #1a1a1a", borderRadius: 12,
            background: "#0d0d0d", textAlign: "center",
            transition: "opacity 0.5s ease"
          }}>
            <div style={{
              fontSize: 10, letterSpacing: 2, color: "#333",
              fontFamily: "'Space Mono', monospace",
              marginBottom: 12, textTransform: "uppercase"
            }}>
              did you know · micro-dramas
            </div>
            <p style={{
              fontSize: 14, color: "#888", lineHeight: 1.7,
              fontStyle: "italic"
            }}>
              "{facts[factIndex]}"
            </p>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}