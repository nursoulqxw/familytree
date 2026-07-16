import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { getTree, renameTree } from '../api/trees'
import InviteManager from '../components/InviteManager'
import Navbar from '../components/Navbar'
import { useTranslation } from '../i18n/useTranslation'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { treeId } = useParams()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    getTree(treeId)
      .then((data) => {
        setTree(data)
        setName(data.name)
      })
      .catch(() => setError(t('treeDetail.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  async function handleSaveName(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === tree.name) return
    setSavingName(true)
    setError('')
    setNameSaved(false)
    try {
      const updated = await renameTree(treeId, trimmed)
      setTree((prev) => ({ ...prev, name: updated.name }))
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch {
      setError(t('dashboard.renameError'))
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-6">
          <Link to={`/trees/${treeId}`} className="text-sm text-ink/70 hover:text-olive no-underline">
            {t('settings.backToTree')}
          </Link>
          <h1 className="font-serif font-black text-2xl text-ink mt-2">{t('settings.title')}</h1>
        </header>

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {tree && (
          <>
            <section className="bg-cream-light border border-cream-border rounded-2xl p-5 mb-6 shadow-xs">
              <h2 className="font-serif font-black text-sm uppercase tracking-tight text-ink mb-3">{t('settings.general')}</h2>
              <form onSubmit={handleSaveName} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="tree-name" className="block text-xs font-semibold text-ink/70 mb-1">
                    {t('settings.treeName')}
                  </label>
                  <input
                    id="tree-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingName || name.trim() === tree.name}
                  className="px-4 py-2 text-xs font-medium bg-olive hover:bg-olive-700 text-white rounded-md shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {nameSaved ? <Check className="h-3.5 w-3.5" /> : null}
                  {savingName ? t('common.saving') : nameSaved ? t('common.saved') : t('common.save')}
                </button>
              </form>
            </section>

            <InviteManager
              treeId={treeId}
              privacy={tree.privacy}
              onPrivacyUpdated={(privacy) => setTree((prev) => ({ ...prev, privacy }))}
            />
          </>
        )}
      </main>
    </div>
  )
}
