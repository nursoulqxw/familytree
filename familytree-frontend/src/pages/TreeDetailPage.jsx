import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Activity, RefreshCw, Share2 } from 'lucide-react'
import { createPerson } from '../api/persons'
import { createRelationship, deleteRelationship } from '../api/relationships'
import { getTree } from '../api/trees'
import AuditLogView from '../components/AuditLogView'
import FamilyTreeGraph from '../components/FamilyTreeGraph'
import InviteManager from '../components/InviteManager'
import MemberProfile from '../components/MemberProfile'
import Navbar from '../components/Navbar'
import PersonModal from '../components/PersonModal'
import RelationshipModal from '../components/RelationshipModal'

// Направление связи из формы "Добавить родственника" в API createRelationship(person_from, person_to, type)
function relationshipArgsFor(relType, newPersonId, connectToId) {
  switch (relType) {
    case 'CHILD':
      // новый человек — ребёнок выбранного: выбранный = parent, новый = child
      return { person_from: connectToId, person_to: newPersonId, relationship_type: 'parent' }
    case 'PARENT':
      // новый человек — родитель выбранного
      return { person_from: newPersonId, person_to: connectToId, relationship_type: 'parent' }
    case 'SPOUSE':
      return { person_from: connectToId, person_to: newPersonId, relationship_type: 'spouse' }
    case 'SIBLING':
      return { person_from: connectToId, person_to: newPersonId, relationship_type: 'sibling' }
    default:
      return null
  }
}

export default function TreeDetailPage() {
  const { treeId } = useParams()
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarTab, setSidebarTab] = useState('activity')

  const [editingPerson, setEditingPerson] = useState(null)
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [showRelationshipModal, setShowRelationshipModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTree(treeId)
      setTree(data)
    } catch {
      setError('Не удалось загрузить дерево')
    } finally {
      setLoading(false)
    }
  }, [treeId])

  useEffect(() => {
    load()
  }, [load])

  const persons = tree?.persons ?? []
  const relationships = tree?.relationships ?? []
  const selectedPerson = persons.find((p) => String(p.id) === String(selectedId)) ?? null

  async function handleAddMember(personData, connectToId, relType) {
    setError('')
    try {
      const created = await createPerson(treeId, personData)
      if (connectToId && relType) {
        const args = relationshipArgsFor(relType, created.id, Number(connectToId))
        if (args) await createRelationship(treeId, args)
      }
      setSelectedId(created.id)
      await load()
    } catch {
      setError('Не удалось добавить человека (нужны права редактора)')
    }
  }

  function handleEditRequest(person) {
    setEditingPerson(person)
    setShowPersonModal(true)
  }

  function handlePersonModalClose() {
    setShowPersonModal(false)
    setEditingPerson(null)
  }

  async function handlePersonSaved() {
    handlePersonModalClose()
    await load()
  }

  async function handlePersonDeleted() {
    handlePersonModalClose()
    setSelectedId(null)
    await load()
  }

  async function handleEdgeClick(relationshipId) {
    if (!window.confirm('Удалить эту связь?')) return
    setError('')
    try {
      await deleteRelationship(treeId, relationshipId)
      await load()
    } catch {
      setError('Не удалось удалить связь')
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar>
        <Link
          to="/dashboard"
          className="text-sm text-ink/70 hover:text-olive no-underline px-3 py-1.5 rounded-lg hover:bg-cream-dark"
        >
          ← Мои деревья
        </Link>
      </Navbar>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {loading ? (
          <div className="col-span-12 flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-cream-border shadow-xs">
            <RefreshCw className="h-8 w-8 text-olive animate-spin mb-3" />
            <p className="font-serif italic text-sm text-ink/60">Загружаем родословное дерево…</p>
          </div>
        ) : error && !tree ? (
          <div className="col-span-12">
            <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm">
              {error}
            </p>
          </div>
        ) : (
          <>
            <section className="lg:col-span-8 bg-white border border-cream-border rounded-[32px] shadow-xs overflow-hidden flex flex-col h-[720px] lg:h-auto min-h-[500px]">
              <div className="px-5 pt-4">
                <h1 className="font-serif font-black text-xl text-ink">{tree.name}</h1>
              </div>
              {error && (
                <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs mx-5 mt-2">
                  {error}
                </p>
              )}
              <FamilyTreeGraph
                persons={persons}
                relationships={relationships}
                selectedId={selectedId}
                onSelectMember={(id) => setSelectedId(Number(id))}
                onAddMember={handleAddMember}
                onAddRelationship={() => setShowRelationshipModal(true)}
                onEdgeClick={handleEdgeClick}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </section>

            <section className="lg:col-span-4 flex flex-col gap-6 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto pr-1 min-w-0">
              <div className="bg-white border border-cream-border rounded-[32px] shadow-xs overflow-hidden h-[500px] flex flex-col shrink-0">
                <MemberProfile
                  treeId={treeId}
                  person={selectedPerson}
                  onClose={() => setSelectedId(null)}
                  onEditRequest={handleEditRequest}
                  onUpdated={load}
                />
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex bg-cream-dark p-1 border border-cream-border rounded-xl text-xs select-none">
                  <button
                    onClick={() => setSidebarTab('activity')}
                    className={`flex-1 py-2 text-center font-medium rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1 bg-transparent border-0 shadow-none
                      ${sidebarTab === 'activity' ? 'bg-white text-olive shadow-xs font-semibold' : 'text-ink/65 hover:text-ink'}`}
                  >
                    <Activity className="h-3.5 w-3.5" /> Журнал
                  </button>
                  <button
                    onClick={() => setSidebarTab('invite')}
                    className={`flex-1 py-2 text-center font-medium rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1 bg-transparent border-0 shadow-none
                      ${sidebarTab === 'invite' ? 'bg-white text-olive shadow-xs font-semibold' : 'text-ink/65 hover:text-ink'}`}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Доступ и инвайты
                  </button>
                </div>

                {sidebarTab === 'activity' ? (
                  <AuditLogView treeId={treeId} />
                ) : (
                  <InviteManager
                    treeId={treeId}
                    privacy={tree.privacy}
                    onPrivacyUpdated={(privacy) => setTree((prev) => ({ ...prev, privacy }))}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {showPersonModal && (
        <PersonModal
          treeId={treeId}
          person={editingPerson}
          onClose={handlePersonModalClose}
          onSaved={handlePersonSaved}
          onDeleted={handlePersonDeleted}
        />
      )}

      {showRelationshipModal && (
        <RelationshipModal
          treeId={treeId}
          persons={persons}
          relationships={relationships}
          onClose={() => setShowRelationshipModal(false)}
          onSaved={async () => {
            setShowRelationshipModal(false)
            await load()
          }}
        />
      )}
    </div>
  )
}
