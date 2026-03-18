import { useState } from "react"
import Upload from "./src/pages/Upload"
import Watch from "./src/pages/Watch"

export default function App() {
  const [page, setPage] = useState("feed")
  const [selectedVideo, setSelectedVideo] = useState(null)

  const goWatch = (video) => {
    setSelectedVideo(video)
    setPage("watch")
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={() => setPage("feed")} style={btn(page === "feed")}>🎬 Feed</button>
        <button onClick={() => setPage("upload")} style={btn(page === "upload")}>⬆️ Upload</button>
      </div>

      {page === "upload" && <Upload />}
      {(page === "feed" || page === "watch") && (
        <Watch selectedVideo={selectedVideo} onSelect={goWatch} />
      )}
    </div>
  )
}

const btn = (active) => ({
  padding: "8px 18px",
  background: active ? "#ff4444" : "#222",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: active ? "bold" : "normal"
})
