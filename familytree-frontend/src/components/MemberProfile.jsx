import { useEffect, useState } from 'react'
import { Calendar, Edit, FileText, History, Image as ImageIcon, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { updatePerson } from '../api/persons'
import { createLifeEvent, deleteLifeEvent, listLifeEvents } from '../api/lifeEvents'
import { deleteMedia, listMedia, uploadMedia } from '../api/media'
import { useTranslation } from '../i18n/useTranslation'

const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }

export default function MemberProfile({ treeId, person, onClose, onEditRequest, onUpdated }) {
  const { t, language } = useTranslation()
  const locale = LOCALES[language]

  function formatDate(dateString) {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const [activeTab, setActiveTab] = useState('biography')

  const [bio, setBio] = useState('')
  const [savingBio, setSavingBio] = useState(false)

  const [events, setEvents] = useState([])
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventDesc, setEventDesc] = useState('')

  const [media, setMedia] = useState([])
  const [showAddMedia, setShowAddMedia] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaCaption, setMediaCaption] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)

  const [error, setError] = useState('')

  useEffect(() => {
    if (!person) return
    setBio(person.bio || '')
    setActiveTab('biography')
    setShowAddEvent(false)
    setShowAddMedia(false)
    setError('')
    listLifeEvents(treeId, person.id).then(setEvents).catch(() => setError(t('memberProfile.loadEventsError')))
    listMedia(treeId, person.id).then(setMedia).catch(() => setError(t('memberProfile.loadMediaError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId, person])

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-cream/40 text-ink/50 select-none">
        <History className="h-12 w-12 text-olive/20 mb-3" />
        <p className="font-serif italic text-sm">{t('memberProfile.emptyState')}</p>
      </div>
    )
  }

  async function handleSaveBio() {
    setSavingBio(true)
    setError('')
    try {
      await updatePerson(treeId, person.id, { bio })
      onUpdated?.()
    } catch {
      setError(t('memberProfile.bioError'))
    } finally {
      setSavingBio(false)
    }
  }

  async function handleAddEvent(e) {
    e.preventDefault()
    if (!eventTitle.trim()) return
    try {
      const created = await createLifeEvent(treeId, person.id, {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        event_date: eventDate || null,
      })
      setEvents((prev) => [...prev, created].sort((a, b) => (a.event_date || '').localeCompare(b.event_date || '')))
      setEventTitle('')
      setEventDate('')
      setEventDesc('')
      setShowAddEvent(false)
    } catch {
      setError(t('memberProfile.eventAddError'))
    }
  }

  async function handleDeleteEvent(eventId) {
    try {
      await deleteLifeEvent(treeId, person.id, eventId)
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
    } catch {
      setError(t('memberProfile.eventDeleteError'))
    }
  }

  async function handleUploadMedia(e) {
    e.preventDefault()
    if (!mediaFile) return
    try {
      const created = await uploadMedia(treeId, person.id, { file: mediaFile, caption: mediaCaption.trim() })
      setMedia((prev) => [created, ...prev])
      setMediaFile(null)
      setMediaCaption('')
      setShowAddMedia(false)
    } catch {
      setError(t('memberProfile.mediaUploadError'))
    }
  }

  async function handleDeleteMedia(mediaId, e) {
    e.stopPropagation()
    try {
      await deleteMedia(treeId, person.id, mediaId)
      setMedia((prev) => prev.filter((m) => m.id !== mediaId))
    } catch {
      setError(t('memberProfile.mediaDeleteError'))
    }
  }

  const isImage = (url) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(url || '')

  return (
    <div className="flex flex-col h-full bg-cream text-ink">
      <div className="bg-cream-dark border-b border-cream-border p-5 relative shrink-0">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xs bg-ink/5 hover:bg-ink/15 text-ink/60 hover:text-ink p-1.5 rounded-full font-semibold cursor-pointer bg-transparent border-0 shadow-none"
          title={t('memberProfile.collapse')}
        >
          &times;
        </button>

        <div className="flex items-start gap-4">
          {person.photo ? (
            <img src={person.photo} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-cream-border shrink-0 shadow-xs" />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-cream-border bg-cream flex items-center justify-center shrink-0 shadow-xs font-serif font-black text-lg text-ink uppercase">
              {person.first_name?.[0]}
              {person.last_name?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-black text-lg truncate leading-snug">
                {person.last_name} {person.first_name} {person.patronymic}
              </h2>
              {onEditRequest && (
                <button
                  onClick={() => onEditRequest(person)}
                  className="p-1.5 hover:bg-ink/5 text-ink/55 hover:text-olive rounded transition cursor-pointer bg-transparent border-0 shadow-none"
                  title={t('common.edit')}
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs text-ink/75 mt-1.5 space-y-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0 opacity-60 text-olive" />
                {formatDate(person.birth_date) || t('memberProfile.noBirthDate')}
                {person.birth_place && <span className="opacity-75">({person.birth_place})</span>}
              </span>
              {person.death_date && (
                <span className="flex items-center gap-1 text-ink/55 font-semibold mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 opacity-50" /> {t('memberProfile.deceasedPrefix')}{formatDate(person.death_date)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-cream-border bg-cream text-xs shrink-0 select-none">
        {[
          { key: 'biography', label: t('memberProfile.tabBio'), Icon: FileText },
          { key: 'timeline', label: t('memberProfile.tabTimeline'), Icon: History },
          { key: 'media', label: t('memberProfile.tabMedia'), Icon: ImageIcon },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-3 text-center border-b px-1 font-serif transition-colors cursor-pointer flex justify-center items-center gap-1 bg-transparent shadow-none
              ${activeTab === key ? 'border-olive text-olive bg-olive/5 font-black' : 'border-transparent text-ink/50 hover:text-olive hover:bg-cream-dark'}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 text-ink bg-cream-light">
        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs mb-3">
            {error}
          </p>
        )}

        {activeTab === 'biography' && (
          <div className="space-y-3">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={8}
              placeholder={t('memberProfile.bioPlaceholder')}
              className="w-full text-sm leading-relaxed bg-[#fcfaf6] p-3 text-ink border border-cream-border rounded-lg focus:outline-none focus:ring-1 focus:ring-olive"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveBio}
                disabled={savingBio}
                className="px-4 py-2 text-xs font-semibold bg-olive text-white rounded-md hover:bg-olive-700 shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-55"
              >
                <Save className="h-3.5 w-3.5" /> {savingBio ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-cream-border pb-2">
              <h3 className="font-serif font-semibold text-sm text-ink/80">{t('memberProfile.timelineHeading')}</h3>
              {!showAddEvent && (
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="px-2.5 py-1 text-[10px] font-bold border border-cream-border text-ink/70 hover:bg-cream-dark rounded-md transition flex items-center gap-0.5 cursor-pointer bg-cream-light"
                >
                  <Plus className="h-3 w-3 text-olive" /> {t('memberProfile.addEvent')}
                </button>
              )}
            </div>

            {showAddEvent && (
              <form onSubmit={handleAddEvent} className="bg-cream-dark border border-cream-border rounded-xl p-3.5 space-y-2.5 text-xs">
                <input
                  type="text"
                  required
                  placeholder={t('memberProfile.eventTitlePlaceholder')}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full p-1.5 border border-cream-border rounded bg-cream-light text-xs focus:outline-none text-ink"
                />
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-1.5 border border-cream-border rounded bg-cream-light text-xs focus:outline-none text-ink"
                />
                <textarea
                  placeholder={t('common.descriptionPlaceholder')}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={2}
                  className="w-full p-1.5 border border-cream-border rounded bg-cream-light text-xs focus:outline-none text-ink"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="px-2.5 py-1 text-[10px] text-ink/65 rounded cursor-pointer hover:bg-cream-dark bg-transparent border-0 shadow-none"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="px-3 py-1 text-[10px] font-semibold bg-olive text-white rounded cursor-pointer hover:bg-olive-700 shadow-xs">
                    {t('memberProfile.saveEvent')}
                  </button>
                </div>
              </form>
            )}

            {events.length === 0 ? (
              <p className="text-xs text-ink/50 italic py-4 text-center">{t('memberProfile.noEvents')}</p>
            ) : (
              <div className="relative border-l border-cream-border pl-4 ml-2 space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative text-xs">
                    <div className="absolute -left-[21.5px] top-1 h-3 w-3 rounded-full bg-cream-light border-2 border-olive shadow-xs" />
                    <div className="bg-cream-light border border-cream-border p-3.5 rounded-xl hover:border-olive/20 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-olive font-bold">{event.event_date}</span>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1 text-ink/40 hover:text-red-700 rounded transition cursor-pointer bg-transparent border-0 shadow-none"
                          title={t('memberProfile.deleteEventTitle')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <h4 className="font-serif font-black text-ink text-[13px] mt-0.5">{event.title}</h4>
                      {event.description && <p className="text-ink/75 text-[11px] leading-relaxed mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-cream-border pb-2">
              <h3 className="font-serif font-semibold text-sm text-ink/80">{t('memberProfile.mediaHeading')}</h3>
              {!showAddMedia && (
                <button
                  onClick={() => setShowAddMedia(true)}
                  className="px-2.5 py-1 text-[10px] font-bold border border-cream-border text-ink/70 hover:bg-cream-dark rounded-md transition flex items-center gap-0.5 cursor-pointer bg-cream-light"
                >
                  <Plus className="h-3 w-3 text-olive" /> {t('memberProfile.uploadButton')}
                </button>
              )}
            </div>

            {showAddMedia && (
              <form onSubmit={handleUploadMedia} className="bg-cream-dark border border-cream-border rounded-xl p-3.5 space-y-2.5 text-xs">
                <input
                  type="file"
                  required
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-olive/10 file:text-olive file:cursor-pointer"
                />
                <input
                  type="text"
                  placeholder={t('memberProfile.captionPlaceholder')}
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  className="w-full p-1.5 border border-cream-border rounded bg-cream-light text-xs focus:outline-none text-ink"
                />
                <div className="flex justify-end gap-1.5 pt-1 border-t border-cream-border">
                  <button
                    type="button"
                    onClick={() => setShowAddMedia(false)}
                    className="px-2.5 py-1 text-[11px] text-ink/60 rounded-md cursor-pointer hover:bg-cream-dark bg-transparent border-0 shadow-none"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="px-3.5 py-1 text-[11px] font-semibold bg-olive text-white rounded-md cursor-pointer hover:bg-olive-700 shadow-xs">
                    {t('memberProfile.uploadSubmit')}
                  </button>
                </div>
              </form>
            )}

            {media.length === 0 ? (
              <p className="text-xs text-ink/50 italic py-4 text-center">{t('memberProfile.noFiles')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {media.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => isImage(item.file) && setPreviewUrl(item.file)}
                    className="bg-cream-light border border-cream-border p-2 rounded-xl cursor-pointer hover:shadow-sm transition-all relative group"
                  >
                    {isImage(item.file) ? (
                      <img src={item.file} alt={item.caption} className="h-28 w-full object-cover rounded-lg bg-cream" />
                    ) : (
                      <a
                        href={item.file}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="h-28 w-full flex items-center justify-center rounded-lg bg-cream text-[10px] text-ink/50 text-center px-2 no-underline"
                      >
                        {item.caption || t('memberProfile.fileFallback')}
                      </a>
                    )}
                    <div className="mt-1.5 p-0.5 text-xs text-left">
                      {item.caption && <h5 className="font-serif font-black text-ink text-[11px] truncate">{item.caption}</h5>}
                    </div>
                    <button
                      onClick={(e) => handleDeleteMedia(item.id, e)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-cream-light/95 text-red-700 hover:text-white hover:bg-red-700 rounded shadow-xs transition duration-150 cursor-pointer border-0"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-3xl w-full text-center relative">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-lg p-2 cursor-pointer flex items-center gap-1 bg-black/50 rounded px-2 border-0"
            >
              &times; {t('common.close')}
            </button>
            <img src={previewUrl} alt={t('memberProfile.previewAlt')} className="max-h-[80vh] mx-auto object-contain rounded-lg border border-white/10 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
