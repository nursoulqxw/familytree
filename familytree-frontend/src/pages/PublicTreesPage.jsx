import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, TreePine } from 'lucide-react'
import { listPublicTrees } from '../api/trees'
import Navbar from '../components/Navbar'
import { useTranslation } from '../i18n/useTranslation'

export default function PublicTreesPage() {
  const { t } = useTranslation()
  const [trees, setTrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listPublicTrees()
      .then(setTrees)
      .catch(() => setError(t('catalog.loadError')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar>
        <Link to="/dashboard" className="text-sm text-ink/70 hover:text-olive no-underline px-3 py-1.5 rounded-lg hover:bg-cream-dark">
          {t('common.backToDashboard')}
        </Link>
      </Navbar>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="font-serif font-black text-2xl text-ink flex items-center gap-2">
            <Globe className="h-6 w-6 text-olive" /> {t('catalog.title')}
          </h1>
          {!loading && !error && <p className="text-sm text-ink/60 mt-1">{t('catalog.count', { n: trees.length })}</p>}
        </header>

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-ink/60">{t('common.loading')}</p>
        ) : trees.length === 0 ? (
          <div className="border border-dashed border-cream-border rounded-2xl py-14 px-6 text-center text-ink/60">
            <Globe className="h-10 w-10 text-olive/30 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg text-ink">{t('catalog.emptyTitle')}</h3>
            <p className="max-w-md mx-auto mt-1.5">{t('catalog.emptyBody')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <Link key={tree.id} to={`/trees/${tree.id}`} className="no-underline block">
                <div className="border border-cream-border rounded-2xl p-5 bg-cream-light shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-olive/40 transition-all h-full">
                  <div className="h-11 w-11 rounded-xl bg-olive/10 text-olive flex items-center justify-center mb-3">
                    <TreePine className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-ink truncate">{tree.name}</h3>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive bg-olive/10 rounded-full px-3 py-1 mt-3">
                    <Globe className="h-3 w-3" /> {t('privacy.public')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
