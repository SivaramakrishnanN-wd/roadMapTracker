import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import { ThemeProvider } from '@/components/ThemeProvider'
import Daily from '@/pages/Daily'
import Dashboard from '@/pages/Dashboard'
import Syllabus from '@/pages/Syllabus'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="daily" element={<Daily />} />
            <Route path="daily/:date" element={<Daily />} />
            <Route path="syllabus" element={<Syllabus />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
