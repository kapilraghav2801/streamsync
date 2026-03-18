import { useState } from "react"
import axios from "axios"
import Navbar from "../components/Navbar"
import API from "../constants/api"
import { input, buttonPrimary, buttonDisabled } from "../styles/common"

export default function Upload({ nav, onDone }) {
  const [title, setTitle] = useState("")
  const [series, setSeries] = useState("")
  const [ep, setEp] = useState(1)
  const [tier, setTier] = useState("new")
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!file || !title || !series) {
      setStatus("Fill all fields and pick a video.")
      return
    }
    const data = new FormData()
    data.append("title", title)
    data.append("series_name", series)
    data.append("episode_number", ep)
    data.append("creator_tier", tier)
    data.append("file", file)
    setLoading(true)
    setStatus("Uploading...")
    try {
      await axios.post(`${API}/videos/upload`, data)
      setStatus("Uploaded successfully!")
      setTimeout(onDone, 800)
    } catch {
      setStatus("Upload failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>
      <Navbar {...nav} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 16px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8e8", marginBottom: 8 }}>
            Upload Episode
          </h2>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>
            Add a new video to the StreamSync feed
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div>
              <label style={labelStyle}>Title</label>
              <input
                placeholder="e.g. The One Where It Begins"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={labelStyle}>Series Name</label>
              <input
                placeholder="e.g. Friends Short"
                value={series}
                onChange={e => setSeries(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={labelStyle}>Episode Number</label>
              <input
                type="number"
                value={ep}
                onChange={e => setEp(parseInt(e.target.value))}
                style={input}
              />
            </div>

            <div>
              <label style={labelStyle}>Creator Type</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                style={{ ...input, color: "#e8e8e8" }}
              >
                <option value="new">New Creator</option>
                <option value="established">Established Creator</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Video File</label>
              <label style={{
                display: "block",
                border: "1px dashed #1e1e1e",
                borderRadius: 8,
                padding: "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                color: file ? "#e8e8e8" : "#444",
                fontSize: 13,
                background: "#0d0d0d"
              }}>
                {file ? file.name : "Click to select video"}
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={e => setFile(e.target.files[0])}
                />
              </label>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              style={loading ? buttonDisabled : buttonPrimary}
            >
              {loading ? "Uploading..." : "Upload"}
            </button>

            {status && (
              <p style={{
                fontSize: 13,
                color: status.includes("fail") ? "#ff4444" : "#66cc88",
                textAlign: "center"
              }}>
                {status}
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: "#555",
  marginBottom: 6,
  fontFamily: "monospace",
  letterSpacing: 1
}
