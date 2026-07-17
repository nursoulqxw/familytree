import { useEffect, useState } from 'react'
import { Calendar, FileClock, Image, RefreshCcw, Settings, Trash2, User, UserMinus, UserPlus, Users } from 'lucide-react'
import { fetchAuditLog } from '../api/trees'
import { useTranslation } from '../i18n/useTranslation'
import { useAuthStore } from '../store/authStore'

const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' }

export default function AuditLogView({ treeId }) {
  const { t, language } = useTranslation()
  const locale = LOCALES[language]

  const ACTION_STYLES = {
    'create:Person': { icon: <UserPlus className="h-3 w-3 text-emerald-700" />, label: t('audit.createPerson'), bg: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
    'delete:Person': { icon: <Trash2 className="h-3 w-3 text-red-600" />, label: t('audit.deletePerson'), bg: 'bg-red-50 text-red-800 border-red-100' },
    'update:Person': { icon: <User className="h-3 w-3 text-olive" />, label: t('audit.updatePerson'), bg: 'bg-olive/5 text-olive border-olive/10' },
    'create:Relationship': { icon: <Users className="h-3 w-3 text-blue-700" />, label: t('audit.createRelationship'), bg: 'bg-blue-50 text-blue-800 border-blue-100' },
    'delete:Relationship': { icon: <Trash2 className="h-3 w-3 text-rose-700" />, label: t('audit.deleteRelationship'), bg: 'bg-rose-50 text-rose-800 border-rose-100' },
    'update:Relationship': { icon: <Users className="h-3 w-3 text-blue-700" />, label: t('audit.updateRelationship'), bg: 'bg-blue-50 text-blue-800 border-blue-100' },
    'update:FamilyTree': { icon: <Settings className="h-3 w-3 text-gray-700" />, label: t('audit.updateTreeSettings'), bg: 'bg-gray-50 text-gray-800 border-gray-100' },
    'create:LifeEvent': { icon: <Calendar className="h-3 w-3 text-emerald-700" />, label: t('audit.createLifeEvent'), bg: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
    'update:LifeEvent': { icon: <Calendar className="h-3 w-3 text-olive" />, label: t('audit.updateLifeEvent'), bg: 'bg-olive/5 text-olive border-olive/10' },
    'delete:LifeEvent': { icon: <Trash2 className="h-3 w-3 text-red-600" />, label: t('audit.deleteLifeEvent'), bg: 'bg-red-50 text-red-800 border-red-100' },
    'create:Media': { icon: <Image className="h-3 w-3 text-emerald-700" />, label: t('audit.createMedia'), bg: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
    'update:Media': { icon: <Image className="h-3 w-3 text-olive" />, label: t('audit.updateMedia'), bg: 'bg-olive/5 text-olive border-olive/10' },
    'delete:Media': { icon: <Trash2 className="h-3 w-3 text-red-600" />, label: t('audit.deleteMedia'), bg: 'bg-red-50 text-red-800 border-red-100' },
    'delete:TreeMember': { icon: <UserMinus className="h-3 w-3 text-rose-700" />, label: t('audit.removeMember'), bg: 'bg-rose-50 text-rose-800 border-rose-100' },
  }

  function styleFor(log) {
    return ACTION_STYLES[`${log.action}:${log.content_type}`] ?? {
      icon: <RefreshCcw className="h-3 w-3 text-stone-600" />,
      label: `${log.action} ${log.content_type}`,
      bg: 'bg-stone-50 text-stone-800 border-stone-100',
    }
  }

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const currentUserId = useAuthStore((state) => state.userId)

  useEffect(() => {
    setLoading(true)
    fetchAuditLog(treeId)
      .then(setLogs)
      .catch(() => setError(t('audit.error')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  return (
    <div className="bg-cream-light border border-cream-border rounded-[32px] p-6 text-ink space-y-4 shadow-xs">
      <div className="border-b border-cream-border pb-3">
        <h3 className="font-serif font-black text-sm tracking-tight text-ink flex items-center gap-1.5 uppercase">
          <FileClock className="h-4 w-4 text-olive" /> {t('audit.title')}
        </h3>
        <p className="text-[10px] text-ink/65 leading-tight mt-1">{t('audit.subtitle')}</p>
      </div>

      {loading ? (
        <p className="text-xs text-ink/40 italic py-6 text-center">{t('common.loading')}</p>
      ) : error ? (
        <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
          {error}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-ink/40 italic py-6 text-center">{t('audit.empty')}</p>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const style = styleFor(log)
            return (
              <div key={log.id} className="text-xs p-3 bg-cream-dark/30 rounded-xl border border-cream-border/50 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border flex items-center gap-1 shrink-0 ${style.bg}`}>
                    {style.icon}
                    {style.label}
                  </span>
                  <span className="text-[9px] font-mono text-ink/40 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-ink/40 border-t border-dashed border-cream-border pt-1.5 mt-1.5">
                  <span>
                    {log.user === currentUserId ? t('audit.byYou') : log.user ? t('audit.byMember', { id: log.user }) : t('audit.unknownMember')}
                  </span>
                  <span className="font-mono text-[8px]">{new Date(log.created_at).toLocaleDateString(locale)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
