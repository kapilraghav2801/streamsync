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

  const nav = {
    page,
    onShorts: () => setPage("shorts"),
    onRelax: () => setPage("relax"),
    onUpload: () => setPage("upload")
  }

  if (page === "shorts") return <Shorts nav={nav} onSelect={v => goWatch(v, "shorts")} />
  if (page === "relax") return <Relax nav={nav} onSelect={v => goWatch(v, "relax")} />
  if (page === "watch") return <Watch video={selectedVideo} onBack={() => setPage(fromPage)} />
  if (page === "upload") return <Upload nav={nav} onDone={() => setPage("shorts")} />
}
