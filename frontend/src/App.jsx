import { useState } from "react"
import Shorts from "./pages/Shorts"
import Relax from "./pages/Relax"
import Watch from "./pages/Watch"
import Upload from "./pages/Upload"

export default function App() {
  const [page, setPage] = useState("shorts")
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [fromPage, setFromPage] = useState("shorts")

  const goWatch = (video, from) => {
    setSelectedVideo(video)
    setFromPage(from)
    setPage("watch")
  }

  if (page === "shorts") return (
    <Shorts
      onUpload={() => setPage("upload")}
      onGoRelax={() => setPage("relax")}
    />
  )
  if (page === "relax") return (
    <Relax
      onSelect={v => goWatch(v, "relax")}
      onGoShorts={() => setPage("shorts")}
      onUpload={() => setPage("upload")}
    />
  )
  if (page === "watch") return <Watch video={selectedVideo} onBack={() => setPage(fromPage)} />
  if (page === "upload") return <Upload onDone={() => setPage("shorts")} />
}