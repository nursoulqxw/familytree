import { Link } from 'react-router-dom'
import { Globe, Link as LinkIcon, Lock, TreePine } from 'lucide-react'

const PRIVACY = {
  private: { label: 'Закрытое', icon: Lock },
  link: { label: 'По ссылке', icon: LinkIcon },
  public: { label: 'Открытое', icon: Globe },
}

export default function TreeCard({ tree, onDelete }) {
  const privacy = PRIVACY[tree.privacy] ?? { label: tree.privacy, icon: Lock }
  const PrivacyIcon = privacy.icon

  return (
    <div className="relative border border-cream-border rounded-2xl p-5 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-olive/40 transition-all">
      <Link to={`/trees/${tree.id}`} className="no-underline block">
        <div className="h-11 w-11 rounded-xl bg-olive/10 text-olive flex items-center justify-center mb-3">
          <TreePine className="h-5.5 w-5.5" />
        </div>
        <h3 className="font-serif font-bold text-lg text-ink truncate">{tree.name}</h3>
      </Link>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive bg-olive/10 rounded-full px-3 py-1 my-3">
        <PrivacyIcon className="h-3 w-3" /> {privacy.label}
      </span>
      {onDelete && (
        <div>
          <button
            type="button"
            className="text-xs font-medium text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer"
            onClick={() => onDelete(tree.id)}
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  )
}
