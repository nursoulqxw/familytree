import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { getTree, renameTree } from '../api/trees'
import InviteManager from '../components/InviteManager'
import Navbar from '../components/Navbar'

export default function SettingsPage() {
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
      .catch(() => setError('Не удалось загрузить дерево'))
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
      setError('Не удалось переименовать дерево (нужны права владельца)')
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
            ← Назад к дереву
          </Link>
          <h1 className="font-serif font-black text-2xl text-ink mt-2">Настройки дерева</h1>
        </header>

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {tree && (
          <>
            <section className="bg-white border border-cream-border rounded-2xl p-5 mb-6 shadow-xs">
              <h2 className="font-serif font-black text-sm uppercase tracking-tight text-ink mb-3">Основное</h2>
              <form onSubmit={handleSaveName} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="tree-name" className="block text-xs font-semibold text-ink/70 mb-1">
                    Название дерева
                  </label>
                  <input
                    id="tree-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full text-sm bg-white rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingName || name.trim() === tree.name}
                  className="px-4 py-2 text-xs font-medium bg-olive hover:bg-olive-700 text-white rounded-md shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {nameSaved ? <Check className="h-3.5 w-3.5" /> : null}
                  {savingName ? 'Сохраняем…' : nameSaved ? 'Сохранено' : 'Сохранить'}
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
