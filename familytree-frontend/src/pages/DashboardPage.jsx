import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, TreePine, UserPlus } from 'lucide-react'
import { createTree, deleteTree, listTrees, renameTree } from '../api/trees'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import TreeCard from '../components/TreeCard'
import { useTranslation } from '../i18n/useTranslation'
import { useAuthStore } from '../store/authStore'

export default function DashboardPage() {
  const { t } = useTranslation()
  const [trees, setTrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [privacy, setPrivacy] = useState('private')

  const username = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    loadTrees()
  }, [])

  async function loadTrees() {
    setLoading(true)
    try {
      const data = await listTrees()
      setTrees(data)
    } catch {
      setError(t('dashboard.loadError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    try {
      await createTree({ name, privacy })
      setName('')
      setPrivacy('private')
      setShowCreate(false)
      await loadTrees()
    } catch {
      setError(t('dashboard.createError'))
    }
  }

  async function handleDelete(treeId) {
    if (!window.confirm(t('dashboard.confirmDelete'))) return
    try {
      await deleteTree(treeId)
      await loadTrees()
    } catch {
      setError(t('dashboard.deleteError'))
    }
  }

  async function handleRename(treeId, newName) {
    try {
      await renameTree(treeId, newName)
      await loadTrees()
    } catch {
      setError(t('dashboard.renameError'))
      throw new Error('rename failed')
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar>
        {username && <span className="font-semibold text-ink font-serif hidden sm:inline">{username}</span>}
        <button
          type="button"
          onClick={logout}
          className="px-3 py-1.5 text-xs font-medium border border-cream-border rounded-lg hover:bg-cream-dark cursor-pointer bg-cream-light"
        >
          {t('common.logout')}
        </button>
      </Navbar>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h1 className="font-serif font-black text-2xl text-ink">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/catalog"
              className="px-4 py-2 text-sm font-medium border border-cream-border bg-cream-light text-ink/80 rounded-lg hover:bg-cream-dark transition flex items-center gap-1.5 no-underline"
            >
              <Globe className="h-4 w-4 text-olive" /> {t('dashboard.catalogLink')}
            </Link>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm font-medium bg-olive text-white rounded-lg hover:bg-olive-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" /> {t('dashboard.createTree')}
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {showCreate && (
          <Modal title={t('dashboard.createTree')} onClose={() => setShowCreate(false)}>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor="tree-name" className="block text-xs font-semibold text-ink/70 mb-1">
                  {t('common.name')}
                </label>
                <input
                  id="tree-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
                />
              </div>
              <div>
                <label htmlFor="tree-privacy" className="block text-xs font-semibold text-ink/70 mb-1">
                  {t('common.privacy')}
                </label>
                <select
                  id="tree-privacy"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full text-sm bg-cream-light text-ink rounded-md border border-cream-border px-3 py-1.5 focus:outline-none"
                >
                  <option value="private">{t('privacy.private')}</option>
                  <option value="link">{t('privacy.link')}</option>
                  <option value="public">{t('privacy.public')}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-xs font-medium text-ink/70 hover:bg-cream-dark rounded-md cursor-pointer bg-transparent border-0 shadow-none"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-olive hover:bg-olive-700 text-white rounded-md shadow-xs cursor-pointer"
                >
                  {t('common.create')}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {loading ? (
          <p className="text-ink/60">{t('common.loading')}</p>
        ) : trees.length === 0 ? (
          <div className="border border-dashed border-cream-border rounded-2xl py-14 px-6 text-center text-ink/60">
            <TreePine className="h-10 w-10 text-olive/30 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg text-ink">{t('dashboard.emptyTitle')}</h3>
            <p className="max-w-md mx-auto mt-1.5">{t('dashboard.emptyBody')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map((tree) => (
              <TreeCard key={tree.id} tree={tree} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
