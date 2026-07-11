import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTree } from '../api/trees'
import InviteManager from '../components/InviteManager'
import Navbar from '../components/Navbar'

export default function SettingsPage() {
  const { treeId } = useParams()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getTree(treeId)
      .then(setTree)
      .catch(() => setError('Не удалось загрузить дерево'))
  }, [treeId])

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
          <InviteManager treeId={treeId} privacy={tree.privacy} onPrivacyUpdated={(privacy) => setTree((prev) => ({ ...prev, privacy }))} />
        )}

        <p className="text-xs italic text-ink/50 mt-6 max-w-md">
          Список участников со списком ролей пока недоступен: на бэкенде нет эндпоинта для получения членов дерева
          (например, GET /api/trees/{'{'}id{'}'}/members/). Появится, когда такой эндпоинт будет реализован.
        </p>
      </main>
    </div>
  )
}
