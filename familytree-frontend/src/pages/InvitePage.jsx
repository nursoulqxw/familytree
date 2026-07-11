import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acceptInvite } from '../api/trees'
import BrandMark from '../components/BrandMark'
import { useAuthStore } from '../store/authStore'

export default function InvitePage() {
  const { token } = useParams()
  const accessToken = useAuthStore((state) => state.accessToken)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = { pathname: `/invite/${token}` }

  async function handleJoin() {
    setError('')
    setSubmitting(true)
    try {
      const data = await acceptInvite(token)
      navigate(`/trees/${data.tree_id}`, { replace: true })
    } catch {
      setError('Приглашение недействительно или уже использовано')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="border border-cream-border rounded-2xl p-10 bg-white shadow max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <BrandMark size={48} />
        </div>
        <h1 className="font-serif font-black text-2xl text-ink mb-4">Приглашение в семейное дерево</h1>

        {!accessToken ? (
          <>
            <p className="text-ink/70 text-sm">Чтобы присоединиться, сначала войдите или зарегистрируйтесь.</p>
            <div className="flex gap-3 justify-center mt-5">
              <Link
                to="/login"
                state={{ from }}
                className="px-4 py-2 text-sm font-semibold bg-olive text-white rounded-lg hover:bg-olive-700 transition shadow-xs no-underline"
              >
                Войти
              </Link>
              <Link
                to="/register"
                state={{ from }}
                className="px-4 py-2 text-sm font-medium border border-cream-border rounded-lg hover:bg-cream-dark no-underline text-ink"
              >
                Зарегистрироваться
              </Link>
            </div>
          </>
        ) : (
          <>
            {error && (
              <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-3">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleJoin}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold bg-olive text-white rounded-lg hover:bg-olive-700 transition shadow-xs cursor-pointer disabled:opacity-55"
            >
              {submitting ? 'Присоединяемся…' : 'Присоединиться'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
