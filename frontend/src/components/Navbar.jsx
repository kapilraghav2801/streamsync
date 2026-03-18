import { buttonSecondary, monoText } from "../styles/common"

export default function Navbar({ page, onShorts, onRelax, onUpload }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 28px",
      borderBottom: "1px solid #1a1a1a",
      background: "rgba(13,13,13,0.95)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      <span style={{ ...monoText, fontSize: 14, fontWeight: 700, color: "#e8e8e8" }}>
        STREAMSYNC
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <NavBtn label="Scroll" active={page === "shorts"} onClick={onShorts} />
        <NavBtn label="Relax" active={page === "relax"} onClick={onRelax} />
        <NavBtn label="Upload" active={page === "upload"} onClick={onUpload} />
      </div>
    </div>
  )
}

function NavBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 16px",
      borderRadius: 20,
      border: "1px solid " + (active ? "#e8e8e8" : "#222"),
      background: active ? "#e8e8e8" : "transparent",
      color: active ? "#000" : "#666",
      fontSize: 13,
      fontWeight: active ? 700 : 400,
      cursor: "pointer"
    }}>
      {label}
    </button>
  )
}
