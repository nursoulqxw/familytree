import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Search, Sliders, UserPlus, Users, ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'

// Внутренний словарь типов связи — на нём завязан FamilyTreeGraph.test.jsx (ожидает именно
// этот объект), поэтому формулировки здесь всегда ru; переведённые подписи для UI собираются
// на лету через t('rel.<key>') там, где они реально показываются (RelationshipModal.jsx).
export const RELATIONSHIP_LABELS = {
  parent: 'Родитель',
  child: 'Ребёнок',
  spouse: 'Супруг(а)',
  sibling: 'Брат/Сестра',
}

const LEVEL_HEIGHT = 180
const BLOCK_WIDTH = 280

/**
 * Строит нормализованные parent->child пары независимо от того, как связь была задана
 * (relationship_type='parent': person_from — родитель; ='child': person_from — ребёнок).
 */
function normalizeParentLinks(relationships) {
  return relationships
    .filter((r) => r.relationship_type === 'parent' || r.relationship_type === 'child')
    .map((r) =>
      r.relationship_type === 'parent'
        ? { id: r.id, parentId: String(r.person_from), childId: String(r.person_to) }
        : { id: r.id, parentId: String(r.person_to), childId: String(r.person_from) },
    )
}

/** Генерационные уровни + позиции узлов (супруги и братья/сёстры выравниваются по уровню родителя). */
function resolvePositions(persons, relationships) {
  const parentLinks = normalizeParentLinks(relationships)
  const spouseLinks = relationships.filter((r) => r.relationship_type === 'spouse')
  const siblingLinks = relationships.filter((r) => r.relationship_type === 'sibling')

  const levels = {}
  const childIds = new Set(parentLinks.map((l) => l.childId))
  const rootNodes = persons.filter((p) => !childIds.has(String(p.id)))

  const resolveLevel = (id, lvl, visited = new Set()) => {
    if (visited.has(id)) return
    visited.add(id)
    levels[id] = Math.max(levels[id] || 0, lvl)
    parentLinks.filter((l) => l.parentId === id).forEach((l) => resolveLevel(l.childId, lvl + 1, visited))
  }
  rootNodes.forEach((p) => resolveLevel(String(p.id), 0))

  spouseLinks.forEach((r) => {
    const a = String(r.person_from)
    const b = String(r.person_to)
    const lvl = Math.max(levels[a] || 0, levels[b] || 0)
    levels[a] = lvl
    levels[b] = lvl
  })
  siblingLinks.forEach((r) => {
    const a = String(r.person_from)
    const b = String(r.person_to)
    const lvl = Math.max(levels[a] || 0, levels[b] || 0)
    levels[a] = lvl
    levels[b] = lvl
  })
  persons.forEach((p) => {
    if (levels[p.id] === undefined) levels[String(p.id)] = 0
  })

  const maxLvl = Math.max(0, ...Object.values(levels))
  const positions = {}

  for (let lvl = 0; lvl <= maxLvl; lvl++) {
    const levelPersons = persons.filter((p) => levels[String(p.id)] === lvl)
    const blocks = []
    const processed = new Set()

    levelPersons.forEach((p) => {
      const id = String(p.id)
      if (processed.has(id)) return
      const spouseRel = spouseLinks.find((r) => String(r.person_from) === id || String(r.person_to) === id)
      const spouseId = spouseRel ? (String(spouseRel.person_from) === id ? String(spouseRel.person_to) : String(spouseRel.person_from)) : null
      const spouseObj = spouseId ? levelPersons.find((sp) => String(sp.id) === spouseId) : null

      if (spouseObj) {
        blocks.push([p, spouseObj])
        processed.add(id)
        processed.add(spouseId)
      } else {
        blocks.push([p])
        processed.add(id)
      }
    })

    const midBlock = (blocks.length - 1) / 2
    const xCenter = 450

    blocks.forEach((blk, idx) => {
      const blockX = xCenter + (idx - midBlock) * BLOCK_WIDTH
      const blockY = 80 + lvl * LEVEL_HEIGHT
      if (blk.length === 2) {
        positions[String(blk[0].id)] = { x: blockX - 100, y: blockY }
        positions[String(blk[1].id)] = { x: blockX + 100, y: blockY }
      } else {
        positions[String(blk[0].id)] = { x: blockX, y: blockY }
      }
    })
  }

  return { positions, levels }
}

function formatYear(dateString) {
  return dateString ? dateString.slice(0, 4) : '????'
}

export default function FamilyTreeGraph({
  persons,
  relationships,
  selectedId,
  onSelectMember,
  onAddMember,
  onAddRelationship,
  onEdgeClick,
  searchQuery,
  setSearchQuery,
}) {
  const { t } = useTranslation()
  const [zoom, setZoom] = useState(0.9)
  const [pan, setPan] = useState({ x: 120, y: 40 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const [activeDragId, setActiveDragId] = useState(null)
  const [isNodeDragging, setIsNodeDragging] = useState(false)
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 })
  const [manualPositions, setManualPositions] = useState({})

  const [showAddForm, setShowAddForm] = useState(false)
  const [connectToId, setConnectToId] = useState('')
  const [newRelType, setNewRelType] = useState('CHILD')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newPatronymic, setNewPatronymic] = useState('')
  const [newGender, setNewGender] = useState('')
  const [newBirthDate, setNewBirthDate] = useState('')
  const [newBirthPlace, setNewBirthPlace] = useState('')

  const canvasRef = useRef(null)

  useEffect(() => {
    if (selectedId) setConnectToId(String(selectedId))
    else if (persons.length > 0) setConnectToId(String(persons[0].id))
  }, [selectedId, persons])

  const { positions, levels } = useMemo(() => resolvePositions(persons, relationships), [persons, relationships])

  const finalPositions = useMemo(() => {
    const res = {}
    persons.forEach((p) => {
      const id = String(p.id)
      res[id] = manualPositions[id] || positions[id] || { x: 450, y: 100 }
    })
    if (activeDragId && isNodeDragging) res[activeDragId] = nodeOffset
    return res
  }, [persons, positions, manualPositions, activeDragId, isNodeDragging, nodeOffset])

  const highlightedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set()
    const q = searchQuery.toLowerCase()
    return new Set(
      persons
        .filter(
          (p) =>
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            (p.patronymic && p.patronymic.toLowerCase().includes(q)) ||
            (p.birth_place && p.birth_place.toLowerCase().includes(q)),
        )
        .map((p) => String(p.id)),
    )
  }, [persons, searchQuery])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2.5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3))
  const handleZoomReset = () => {
    setZoom(0.85)
    setPan({ x: 150, y: 50 })
  }

  const handleCanvasMouseDown = (e) => {
    if (isNodeDragging) return
    const target = e.target
    if (target.id === 'canvas-bg' || target.id === 'grid-canvas-svg' || target.tagName === 'svg') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    } else if (isNodeDragging && activeDragId) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        setNodeOffset({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        })
      }
    }
  }

  const handleCanvasMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (isNodeDragging && activeDragId) {
      setManualPositions((prev) => ({ ...prev, [activeDragId]: nodeOffset }))
      setIsNodeDragging(false)
      setActiveDragId(null)
    }
  }

  const handleNodeDragStart = (e, id) => {
    e.stopPropagation()
    setActiveDragId(id)
    setIsNodeDragging(true)
    setNodeOffset(finalPositions[id])
  }

  const handleFocusNode = (id) => {
    const pos = finalPositions[id]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (pos && rect) {
      setPan({ x: rect.width / 2 - pos.x * zoom, y: rect.height / 2 - pos.y * zoom })
      onSelectMember(id)
    }
  }

  // Линии родитель-ребёнок и брачные мостики (супруги + их общие дети)
  const paths = useMemo(() => {
    const parentLinks = normalizeParentLinks(relationships)
    const byParent = {}
    parentLinks.forEach((l) => {
      if (!byParent[l.parentId]) byParent[l.parentId] = []
      byParent[l.parentId].push(l.childId)
    })

    const lines = []
    const renderedBridges = new Set()

    relationships
      .filter((r) => r.relationship_type === 'spouse')
      .forEach((rel) => {
        const p1 = String(rel.person_from)
        const p2 = String(rel.person_to)
        const key = [p1, p2].sort().join('-')
        if (renderedBridges.has(key)) return
        renderedBridges.add(key)

        const pos1 = finalPositions[p1]
        const pos2 = finalPositions[p2]
        if (!pos1 || !pos2) return

        lines.push(
          <g
            key={`spouse-${key}`}
            onClick={(e) => {
              e.stopPropagation()
              onEdgeClick?.(rel.id)
            }}
            className={onEdgeClick ? 'cursor-pointer' : undefined}
          >
            {/* прозрачная более толстая линия сверху — увеличивает область клика */}
            <line x1={pos1.x} y1={pos1.y + 35} x2={pos2.x} y2={pos2.y + 35} stroke="transparent" strokeWidth="14" />
            <line x1={pos1.x} y1={pos1.y + 35} x2={pos2.x} y2={pos2.y + 35} stroke="#5a5a40" strokeWidth="2" strokeDasharray="4 2" opacity="0.8" />
            <circle cx={(pos1.x + pos2.x) / 2} cy={(pos1.y + pos2.y) / 2 + 35} r="9" fill="#f5f5f0" stroke="#5a5a40" strokeWidth="1.5" />
          </g>,
        )

        const common = (byParent[p1] || []).filter((id) => (byParent[p2] || []).includes(id))
        if (common.length > 0) {
          const midX = (pos1.x + pos2.x) / 2
          const midY = (pos1.y + pos2.y) / 2 + 35
          const busY = midY + 45
          lines.push(
            <line key={`spouse-down-${key}`} x1={midX} y1={midY + 9} x2={midX} y2={busY} stroke="#5a5a40" strokeWidth="1.5" strokeDasharray="4" />,
          )
          common.forEach((childId) => {
            const cp = finalPositions[childId]
            if (!cp) return
            lines.push(
              <path
                key={`bus-${key}-${childId}`}
                d={`M ${midX} ${busY} L ${cp.x} ${busY} L ${cp.x} ${cp.y - 35}`}
                fill="none"
                stroke="#5a5a40"
                strokeWidth="1.5"
                strokeDasharray="4"
                strokeLinecap="round"
              />,
            )
          })
        }
      })

    parentLinks.forEach(({ id, parentId, childId }) => {
      const spouseRel = relationships.find(
        (r) => r.relationship_type === 'spouse' && (String(r.person_from) === parentId || String(r.person_to) === parentId),
      )
      if (spouseRel) {
        const spouseId = String(spouseRel.person_from) === parentId ? String(spouseRel.person_to) : String(spouseRel.person_from)
        if ((byParent[spouseId] || []).includes(childId)) return // уже нарисовано мостиком
      }
      const pPos = finalPositions[parentId]
      const cPos = finalPositions[childId]
      if (!pPos || !cPos) return
      const midY = (pPos.y + 35 + cPos.y - 35) / 2
      const d = `M ${pPos.x} ${pPos.y + 35} C ${pPos.x} ${midY}, ${cPos.x} ${midY}, ${cPos.x} ${cPos.y - 35}`
      lines.push(
        <g
          key={`solo-${parentId}-${childId}`}
          onClick={(e) => {
            e.stopPropagation()
            onEdgeClick?.(id)
          }}
          className={onEdgeClick ? 'cursor-pointer' : undefined}
        >
          <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
          <path d={d} fill="none" stroke="#d1d1c4" strokeWidth="1.5" strokeDasharray="4" opacity="0.9" />
        </g>,
      )
    })

    return lines
  }, [relationships, finalPositions, onEdgeClick])

  function handleAddNewRelation(e) {
    e.preventDefault()
    if (!newFirstName.trim()) return

    const personData = {
      first_name: newFirstName.trim(),
      last_name: newLastName.trim(),
      patronymic: newPatronymic.trim() || undefined,
      gender: newGender || undefined,
      birth_date: newBirthDate || null,
      birth_place: newBirthPlace.trim() || undefined,
    }

    onAddMember(personData, connectToId || undefined, newRelType)

    setNewFirstName('')
    setNewLastName('')
    setNewPatronymic('')
    setNewGender('')
    setNewBirthDate('')
    setNewBirthPlace('')
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-cream-light border-b border-cream-border p-4 rounded-t-[32px]">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
          <input
            type="text"
            placeholder={t('graph.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cream-light text-ink text-sm pl-9 pr-4 py-2 rounded-lg border border-cream-border focus:outline-none focus:ring-1 focus:ring-olive"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs font-semibold text-ink/50 hover:text-ink cursor-pointer bg-transparent border-0 shadow-none p-0"
            >
              {t('graph.resetSearch')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-xs font-medium bg-olive text-white rounded-lg hover:bg-olive-700 transition shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" /> {t('graph.addRelative')}
          </button>

          {onAddRelationship && persons.length >= 2 && (
            <button
              onClick={onAddRelationship}
              className="px-4 py-2 text-xs font-medium border border-cream-border bg-cream-light text-ink/80 rounded-lg hover:bg-cream-dark transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-olive" /> {t('common.addRelationship')}
            </button>
          )}

          <div className="h-4 w-px bg-cream-border mx-1" />

          <div className="flex bg-cream-dark rounded-lg p-0.5 border border-cream-border shrink-0">
            <button onClick={handleZoomOut} title={t('graph.zoomOut')} className="p-1.5 text-ink/70 hover:text-ink rounded-md hover:bg-ink/5 cursor-pointer bg-transparent border-0 shadow-none">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleZoomReset} title={t('graph.zoomReset')} className="p-1.5 text-ink/70 hover:text-ink rounded-md hover:bg-ink/5 cursor-pointer bg-transparent border-0 shadow-none">
              <Maximize className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleZoomIn} title={t('graph.zoomIn')} className="p-1.5 text-ink/70 hover:text-ink rounded-md hover:bg-ink/5 cursor-pointer bg-transparent border-0 shadow-none">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="w-full h-[580px] bg-cream relative overflow-hidden select-none cursor-grab active:cursor-grabbing border-b border-cream-border"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div
          id="canvas-bg"
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#5a5a40 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="absolute left-4 bottom-4 bg-cream-light/90 backdrop-blur-xs border border-cream-border px-3 py-1.5 rounded-md text-xs font-mono text-ink/70 shadow-xs select-none pointer-events-none">
          {t('graph.zoomLabel', { n: Math.round(zoom * 100) })}
        </div>

        <div className="absolute right-4 bottom-4 bg-cream-light/90 backdrop-blur-xs border border-cream-border px-3 py-1.5 rounded-md text-[10px] text-ink/60 shadow-xs select-none pointer-events-none flex items-center gap-1 max-w-xs">
          <Sliders className="h-3 w-3 shrink-0 text-olive" /> {t('graph.dragHint')}
        </div>

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning || isNodeDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="absolute inset-0 cursor-default pointer-events-none"
        >
          <svg id="grid-canvas-svg" className="overflow-visible absolute inset-0 pointer-events-auto" style={{ width: '3000px', height: '3000px' }}>
            {paths}
          </svg>

          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {persons.map((person) => {
              const id = String(person.id)
              const pos = finalPositions[id] || { x: 450, y: 100 }
              const isSelected = String(selectedId) === id
              const isMatch = highlightedIds.has(id)
              const isAlive = !person.death_date

              return (
                <div
                  key={id}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => handleNodeDragStart(e, id)}
                  className={`absolute w-[190px] p-4 rounded-xl border text-left cursor-pointer transition-all pointer-events-auto select-none shadow-xs hover:shadow-md
                    ${
                      isSelected
                        ? 'bg-[#fcfaf2] border-olive ring-2 ring-olive/20 z-40'
                        : isMatch
                          ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 z-30'
                          : 'bg-cream-light border-cream-border hover:border-olive/50 z-10'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectMember(id)
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    handleFocusNode(id)
                  }}
                >
                  <div className="absolute top-1.5 right-2.5 text-[8px] font-mono text-ink/35 uppercase select-none">
                    {t('graph.generationBadge', { n: levels[id] !== undefined ? levels[id] + 1 : '?' })}
                  </div>

                  <div className="flex items-center gap-2 pr-6">
                    {person.photo ? (
                      <img src={person.photo} alt="" className="h-8 w-8 rounded-full object-cover border border-cream-border shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-olive/10 text-olive font-serif font-bold text-xs flex items-center justify-center shrink-0">
                        {person.first_name?.[0]}
                        {person.last_name?.[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-serif font-semibold text-[11px] text-ink/75 leading-tight truncate">{person.last_name}</h4>
                      <h4 className="font-serif font-bold text-sm text-ink leading-tight truncate">{person.first_name}</h4>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono font-medium text-ink/60 flex items-center justify-between mt-2 pt-1.5 border-t border-cream-border/60">
                    <span>{formatYear(person.birth_date)}</span>
                    <span className="opacity-40">{isAlive ? t('graph.present') : `— ${formatYear(person.death_date)}`}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-cream border border-cream-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-olive px-5 py-4 text-white flex justify-between items-center">
              <h3 className="font-serif font-black text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> {t('graph.addMemberHeader')}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/80 hover:text-white font-sans text-xl font-bold cursor-pointer bg-transparent border-0 p-0 shadow-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddNewRelation} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-ink">
              {persons.length > 0 && (
                <div className="bg-cream-dark border border-cream-border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label htmlFor="new-member-connect-to" className="block text-xs font-semibold text-ink/70 mb-1">
                      {t('graph.connectToLabel')}
                    </label>
                    <select
                      id="new-member-connect-to"
                      value={connectToId}
                      onChange={(e) => setConnectToId(e.target.value)}
                      className="w-full text-xs bg-cream-light text-ink rounded-md border border-cream-border p-1.5 focus:outline-none"
                    >
                      {persons.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.last_name} {p.first_name} ({formatYear(p.birth_date)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="new-member-rel-type" className="block text-xs font-semibold text-ink/70 mb-1">
                      {t('graph.relationDegreeLabel')}
                    </label>
                    <select
                      id="new-member-rel-type"
                      value={newRelType}
                      onChange={(e) => setNewRelType(e.target.value)}
                      className="w-full text-xs bg-cream-light text-ink rounded-md border border-cream-border p-1.5 focus:outline-none"
                    >
                      <option value="CHILD">{t('graph.optChild')}</option>
                      <option value="PARENT">{t('graph.optParent')}</option>
                      <option value="SPOUSE">{t('graph.optSpouse')}</option>
                      <option value="SIBLING">{t('graph.optSibling')}</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-member-last-name" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.lastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="new-member-last-name"
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="new-member-first-name" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.firstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="new-member-first-name"
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-member-patronymic" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.patronymic')}
                  </label>
                  <input
                    id="new-member-patronymic"
                    type="text"
                    value={newPatronymic}
                    onChange={(e) => setNewPatronymic(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="new-member-gender" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.gender')}
                  </label>
                  <select
                    id="new-member-gender"
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none text-ink"
                  >
                    <option value="">{t('common.genderUnset')}</option>
                    <option value="M">{t('common.genderMale')}</option>
                    <option value="F">{t('common.genderFemale')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-member-birth-date" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.birthDate')}
                  </label>
                  <input
                    id="new-member-birth-date"
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none text-ink"
                  />
                </div>
                <div>
                  <label htmlFor="new-member-birth-place" className="block text-xs font-semibold text-ink/70 mb-0.5">
                    {t('common.birthPlace')}
                  </label>
                  <input
                    id="new-member-birth-place"
                    type="text"
                    value={newBirthPlace}
                    onChange={(e) => setNewBirthPlace(e.target.value)}
                    className="w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none text-ink"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-cream-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-medium text-ink/70 hover:bg-cream-dark rounded-md cursor-pointer bg-transparent border-0 shadow-none"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium bg-olive hover:bg-olive-700 text-white rounded-md shadow-xs cursor-pointer">
                  {t('graph.submitAdd')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
