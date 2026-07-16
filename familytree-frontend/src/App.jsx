import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import InvitePage from './pages/InvitePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import PublicTreesPage from './pages/PublicTreesPage'
import RegisterPage from './pages/RegisterPage'
import SettingsPage from './pages/SettingsPage'
import TimelinePage from './pages/TimelinePage'
import TreeDetailPage from './pages/TreeDetailPage'
import PrivateRoute from './routes/PrivateRoute'
import { useUiStore } from './store/uiStore'

export default function App() {
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalog" element={<PublicTreesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/trees/:treeId" element={<TreeDetailPage />} />
          <Route path="/trees/:treeId/timeline" element={<TimelinePage />} />
          <Route path="/trees/:treeId/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
