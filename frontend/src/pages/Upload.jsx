import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"


export default function Upload({ onDone }) {
  const [form, setForm] = useState({ title: "", series_name: "", episode_number: 1, creator_tier: "new" })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!file || !form.title || !form.series_name) { setStatus("Fill all fields and pick a video."); return }
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    data.append("file", file)
    setLoading(true); setStatus("Uploading...")
    try {
      await axios.post(`${API}/videos/upload`, data)
      setStatus("Uploaded!")
      setTimeout(onDone, 800)
    } catch { setStatus("Upload failed."); setLoading(false) }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 420, padding: 40 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#444", marginBottom: 32, textTransform: "uppercase" }}>
          Upload Episode
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[{ k: "title", p: "Title" }, { k: "series_name", p: "Series Name" }].map(({ k, p }) => (
            <input key={k} placeholder={p} value={form[k]}
              onChange={e => setForm({ ...form, [k]: e.target.value })}
              style={inp} />
          ))}
          <input type="number" value={form.episode_number}
            onChange={e => setForm({ ...form, episode_number: parseInt(e.target.value) })}
            style={inp} />
          <select value={form.creator_tier}
            onChange={e => setForm({ ...form, creator_tier: e.target.value })}
            style={{ ...inp, color: "#e8e8e8" }}>
            <option value="new">New Creator</option>
            <option value="established">Established Creator</option>
          </select>
          <label style={{
            border: "1px dashed #1e1e1e", borderRadius: 8, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", color: file ? "#e8e8e8" : "#333", fontSize: 13
          }}>
            {file ? `✓ ${file.name}` : "Click to select video"}
            <input type="file" accept="video/*" style={{ display: "none" }}
              onChange={e => setFile(e.target.files[0])} />
          </label>
          <button onClick={submit} disabled={loading} style={{
            padding: 14, background: loading ? "#111" : "#e8e8e8",
            color: loading ? "#333" : "#000", border: "none",
            borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }}>
            {loading ? "Uploading..." : "Upload"}
          </button>
          {status && <p style={{ fontSize: 12, color: status.includes("fail") ? "#ff4444" : "#888", fontFamily: "'Space Mono', monospace" }}>{status}</p>}
        </div>
      </div>
    </div>
  )
}

const inp = {
  padding: "11px 14px", background: "#0d0d0d",
  border: "1px solid #1e1e1e", borderRadius: 8,
  color: "#e8e8e8", fontSize: 13, outline: "none"
}