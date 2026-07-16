import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Относительный '/api' работает, когда фронт и бэк на одном origin (Vite dev-прокси,
// nginx-контейнер в docker-compose). Если задеплоены на разные домены (например
// Vercel + Render), нужен абсолютный VITE_API_URL — см. DEPLOY.md.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default client
