import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Globe, Link as LinkIcon, Lock, Pencil, TreePine, X } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

export default function TreeCard({ tree, onDelete, onRename }) {
  const { t } = useTranslation()
  const PRIVACY = {
    private: { label: t('privacy.private'), icon: Lock },
    link: { label: t('privacy.link'), icon: LinkIcon },
    public: { label: t('privacy.public'), icon: Globe },
  }
  const privacy = PRIVACY[tree.privacy] ?? { label: tree.privacy, icon: Lock }
  const PrivacyIcon = privacy.icon

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tree.name)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(tree.name)
  }, [tree.name])

  function cancelEdit() {
    setEditing(false)
    setName(tree.name)
  }

  async function saveEdit() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === tree.name) {
      cancelEdit()
      return
    }
    setSaving(true)
    try {
      await onRename(tree.id, trimmed)
      setEditing(false)
    } catch {
      setName(tree.name)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative border border-cream-border rounded-2xl p-5 bg-cream-light shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-olive/40 transition-all group">
      <Link to={`/trees/${tree.id}`} className="no-underline block">
        <div className="h-11 w-11 rounded-xl bg-olive/10 text-olive flex items-center justify-center mb-3">
          <TreePine className="h-5.5 w-5.5" />
        </div>
      </Link>

      {editing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            disabled={saving}
            className="flex-1 min-w-0 text-sm font-serif font-bold text-ink border border-olive rounded-md px-2 py-1 focus:outline-none"
          />
          <button
            type="button"
            onClick={saveEdit}
            disabled={saving}
            title={t('common.save')}
            className="p-1.5 text-olive hover:bg-olive/10 rounded-md cursor-pointer bg-transparent border-0 shadow-none disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            title={t('common.cancel')}
            className="p-1.5 text-ink/50 hover:bg-cream-dark rounded-md cursor-pointer bg-transparent border-0 shadow-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link to={`/trees/${tree.id}`} className="no-underline min-w-0 flex-1">
            <h3 className="font-serif font-bold text-lg text-ink truncate">{tree.name}</h3>
          </Link>
          {onRename && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title={t('common.rename')}
              className="p-1 text-ink/30 hover:text-olive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0 shadow-none shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive bg-olive/10 rounded-full px-3 py-1 my-3">
        <PrivacyIcon className="h-3 w-3" /> {privacy.label}
      </span>
      {onDelete && (
        <div>
          <button
            type="button"
            className="text-xs font-medium text-rose-700 border border-rose-200 bg-cream-light hover:bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer"
            onClick={() => onDelete(tree.id)}
          >
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
