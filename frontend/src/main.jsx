import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import WakeUp from './components/WakeUp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WakeUp>
      <App />
    </WakeUp>
  </StrictMode>
)
```

---

## 3. Backend Code Changes for Deployment

### `backend/.env` — new file (never commit this)
```
DATABASE_URL=postgresql://your-supabase-url
REDIS_URL=rediss://your-upstash-url
AWS_BUCKET_NAME=streamsync-videos
AWS_REGION=ap-south-1