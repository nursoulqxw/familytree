import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Baby,
  ChevronDown,
  ChevronRight,
  Flower2,
  Image as ImageIcon,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react'
import { fetchTimeline, getTree } from '../api/trees'
import Navbar from '../components/Navbar'

const TYPE_META = {
  birth: { label: 'Рождения', Icon: Baby, chip: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  death: { label: 'Смерти', Icon: Flower2, chip: 'text-stone-700 bg-stone-100 border-stone-300' },
  life_event: { label: 'События', Icon: Star, chip: 'text-olive bg-olive/10 border-olive/20' },
}

const COLLAPSE_THRESHOLD = 4

function decadeOf(dateString) {
  const year = Number(dateString.slice(0, 4))
  return Math.floor(year / 10) * 10
}

function personName(person) {
  return [person.last_name, person.first_name, person.patronymic].filter(Boolean).join(' ')
}

function entryLabel(entry) {
  if (entry.type === 'birth') return `Родился(-ась) ${personName(entry.person)}`
  if (entry.type === 'death') return `Не стало ${personName(entry.person)}`
  return entry.title || 'Событие'
}

export default function TimelinePage() {
  const { treeId } = useParams()
  const navigate = useNavigate()

  const [treeName, setTreeName] = useState('')
  const [allPersons, setAllPersons] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [scope, setScope] = useState('all') // 'all' | 'ancestors' | 'zhety_ata'
  const [anchorId, setAnchorId] = useState('')
  const [depth, setDepth] = useState(10)

  const [typeFilter, setTypeFilter] = useState({ birth: true, death: true, life_event: true })
  const [aliveFilter, setAliveFilter] = useState('all') // 'all' | 'alive' | 'deceased'
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false)
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')

  const [expandedDecades, setExpandedDecades] = useState({})

  useEffect(() => {
    getTree(treeId)
      .then((tree) => {
        setTreeName(tree.name)
        setAllPersons(tree.persons)
        if (tree.persons.length > 0) setAnchorId(String(tree.persons[0].id))
      })
      .catch(() => setError('Не удалось загрузить дерево'))
  }, [treeId])

  useEffect(() => {
    if (scope !== 'all' && !anchorId) return
    setLoading(true)
    setError('')
    const params = {}
    if (scope === 'ancestors') {
      params.personId = anchorId
      if (depth) params.depth = depth
    } else if (scope === 'zhety_ata') {
      params.personId = anchorId
      params.depth = 7
      params.line = 'paternal'
    }

    fetchTimeline(treeId, params)
      .then(setEntries)
      .catch(() => setError('Не удалось загрузить хронологию'))
      .finally(() => setLoading(false))
  }, [treeId, scope, anchorId, depth])

  const deceasedIds = useMemo(
    () => new Set(entries.filter((e) => e.type === 'death').map((e) => e.person.id)),
    [entries],
  )

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!typeFilter[e.type]) return false
      if (onlyWithPhoto && !e.person.photo) return false
      if (aliveFilter === 'alive' && deceasedIds.has(e.person.id)) return false
      if (aliveFilter === 'deceased' && !deceasedIds.has(e.person.id)) return false
      const year = Number(e.date.slice(0, 4))
      if (yearFrom && year < Number(yearFrom)) return false
      if (yearTo && year > Number(yearTo)) return false
      return true
    })
  }, [entries, typeFilter, onlyWithPhoto, aliveFilter, deceasedIds, yearFrom, yearTo])

  const decades = useMemo(() => {
    const buckets = new Map()
    filtered.forEach((e) => {
      const d = decadeOf(e.date)
      if (!buckets.has(d)) buckets.set(d, [])
      buckets.get(d).push(e)
    })
    return [...buckets.entries()].sort((a, b) => a[0] - b[0])
  }, [filtered])

  function toggleType(type) {
    setTypeFilter((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  function toggleDecade(decade) {
    setExpandedDecades((prev) => ({ ...prev, [decade]: !prev[decade] }))
  }

  function openPerson(personId) {
    navigate(`/trees/${treeId}?person=${personId}`)
  }

  const scopeInputClass =
    'text-xs bg-white text-ink rounded-md border border-cream-border px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive'

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-ink/50">{treeName}</p>
            <h1 className="font-serif font-black text-2xl text-ink">Хронология семьи</h1>
          </div>
        </header>

        {/* --- фильтры --- */}
        <div className="bg-white border border-cream-border rounded-2xl p-5 mb-6 space-y-4 shadow-xs">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink/80">Охват:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setScope('all')}
                className={`py-2 px-1 text-xs rounded-xl border flex flex-col items-center gap-1 cursor-pointer bg-white
                  ${scope === 'all' ? 'border-olive bg-olive/5 text-olive font-semibold' : 'border-cream-border text-ink/60 hover:bg-cream-dark'}`}
              >
                <Users className="h-3.5 w-3.5" />
                Вся семья
              </button>
              <button
                onClick={() => setScope('ancestors')}
                className={`py-2 px-1 text-xs rounded-xl border flex flex-col items-center gap-1 cursor-pointer bg-white
                  ${scope === 'ancestors' ? 'border-olive bg-olive/5 text-olive font-semibold' : 'border-cream-border text-ink/60 hover:bg-cream-dark'}`}
              >
                Прямые предки
              </button>
              <button
                onClick={() => setScope('zhety_ata')}
                className={`py-2 px-1 text-xs rounded-xl border flex flex-col items-center gap-1 cursor-pointer bg-white
                  ${scope === 'zhety_ata' ? 'border-olive bg-olive/5 text-olive font-semibold' : 'border-cream-border text-ink/60 hover:bg-cream-dark'}`}
              >
                Жеті ата
              </button>
            </div>

            {scope !== 'all' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className={scopeInputClass}>
                  {allPersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personName(p)}
                    </option>
                  ))}
                </select>

                {scope === 'ancestors' && (
                  <label className="flex items-center gap-1.5 text-xs text-ink/70">
                    поколений:
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={depth}
                      onChange={(e) => setDepth(e.target.value)}
                      className={`${scopeInputClass} w-16`}
                    />
                  </label>
                )}

                {scope === 'zhety_ata' && (
                  <p className="text-[11px] text-ink/50 italic">
                    Семь поколений предков строго по мужской линии. Работает только там, где у предков указан пол —
                    цепочка обрывается на первом человеке без пола (карточка «Редактировать», поле «Пол»).
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-1 border-t border-cream-border">
            <div className="space-y-1.5 pt-3">
              <label className="block text-xs font-semibold text-ink/80">Типы событий:</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border flex items-center gap-1 cursor-pointer transition
                      ${typeFilter[type] ? meta.chip : 'text-ink/40 bg-white border-cream-border'}`}
                  >
                    <meta.Icon className="h-3 w-3" /> {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-3">
              <label className="block text-xs font-semibold text-ink/80">Живые / ушедшие:</label>
              <select value={aliveFilter} onChange={(e) => setAliveFilter(e.target.value)} className={scopeInputClass}>
                <option value="all">Все</option>
                <option value="alive">Только живые</option>
                <option value="deceased">Только ушедшие</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink/80">Период:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="с года"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className={`${scopeInputClass} w-24`}
                />
                <span className="text-ink/40 text-xs">—</span>
                <input
                  type="number"
                  placeholder="по год"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className={`${scopeInputClass} w-24`}
                />
              </div>
            </div>

            <div className="space-y-1.5 flex items-end">
              <label className="flex items-center gap-1.5 text-xs text-ink/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithPhoto}
                  onChange={(e) => setOnlyWithPhoto(e.target.checked)}
                  className="accent-olive"
                />
                <ImageIcon className="h-3.5 w-3.5" /> Только с фото
              </label>
            </div>
          </div>
        </div>

        {/* --- лента --- */}
        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink/50">
            <RefreshCw className="h-6 w-6 text-olive animate-spin mb-2" />
            <p className="font-serif italic text-sm">Собираем хронологию…</p>
          </div>
        ) : decades.length === 0 ? (
          <div className="border border-dashed border-cream-border rounded-2xl py-14 px-6 text-center text-ink/60">
            <p className="font-serif font-bold text-lg text-ink">Событий не найдено</p>
            <p className="mt-1.5 text-sm">Попробуйте ослабить фильтры или выбрать другой охват.</p>
          </div>
        ) : (
          <div className="relative border-l border-cream-border pl-5 ml-2 space-y-6">
            {decades.map(([decade, items]) => {
              const collapsed = items.length > COLLAPSE_THRESHOLD && !expandedDecades[decade]
              return (
                <div key={decade}>
                  <div className="flex items-center gap-2 mb-2 -ml-[29px]">
                    <div className="h-3 w-3 rounded-full bg-olive shrink-0" />
                    <h2 className="font-serif font-black text-sm text-ink/80">{decade}-е</h2>
                    {items.length > COLLAPSE_THRESHOLD && (
                      <button
                        onClick={() => toggleDecade(decade)}
                        className="text-[11px] text-olive font-semibold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 shadow-none px-1"
                      >
                        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {items.length} событий
                      </button>
                    )}
                  </div>

                  {!collapsed && (
                    <div className="space-y-2">
                      {items.map((entry) => {
                        const meta = TYPE_META[entry.type]
                        return (
                          <button
                            key={entry.id}
                            onClick={() => openPerson(entry.person.id)}
                            className="w-full flex items-center gap-3 bg-white border border-cream-border rounded-xl px-3.5 py-2.5 text-left hover:border-olive/40 hover:shadow-sm transition cursor-pointer"
                          >
                            {entry.person.photo ? (
                              <img src={entry.person.photo} alt="" className="h-9 w-9 rounded-full object-cover border border-cream-border shrink-0" />
                            ) : (
                              <div className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 ${meta.chip}`}>
                                <meta.Icon className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-ink truncate">{entryLabel(entry)}</p>
                              {entry.type === 'life_event' && entry.description && (
                                <p className="text-xs text-ink/50 truncate">{entry.description}</p>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-ink/40 shrink-0">{entry.date}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
