import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { login } from '../api/auth'
import BrandMark from '../components/BrandMark'
import { useTranslation } from '../i18n/useTranslation'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loginSuccess = useAuthStore((state) => state.loginSuccess)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await login({ username, password })
      loginSuccess(data, username)
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch {
      setError(t('login.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-cream">
      <div className="relative bg-olive text-white p-10 md:p-14 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-3 font-serif text-xl font-black relative z-10">
          <BrandMark size={32} />
          {t('brand.name')}
        </div>
        <p className="font-serif text-3xl md:text-4xl leading-snug max-w-md relative z-10">
          {t('login.heroPrefix')}
          <span className="text-olive-100">{t('login.heroHighlight')}</span>
          {t('login.heroSuffix')}
        </p>
        <p className="text-sm opacity-80 relative z-10">{t('login.heroFoot')}</p>
        <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-white/5" />
      </div>

      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="h-10 w-10 bg-olive text-white rounded-lg flex items-center justify-center shadow-xs mb-5 md:hidden">
            <BookOpen className="h-5.5 w-5.5" />
          </div>
          <h1 className="font-serif font-black text-2xl text-ink mb-1">{t('login.title')}</h1>
          <p className="text-ink/60 text-sm mb-7">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-ink/70 mb-1">
                {t('common.username')}
              </label>
              <input
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-ink/70 mb-1">
                {t('common.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-2 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
              />
            </div>

            {error && (
              <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2.5 text-sm font-semibold bg-olive text-white rounded-lg hover:bg-olive-700 transition shadow-xs cursor-pointer disabled:opacity-55"
            >
              {submitting ? t('login.submitting') : t('common.login')}
            </button>
          </form>

          <p className="text-sm text-ink/70 mt-6">
            {t('login.noAccount')}
            <Link to="/register" className="font-semibold text-olive hover:underline">
              {t('common.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
