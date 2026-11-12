import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { captureAttribution } from './lib/attribution'

captureAttribution()
initAnalytics()

createRoot(document.getElementById('root')!).render(<App />)
