import { useEffect, useState } from 'react'
import { Check, Copy, Globe, Link as LinkIcon, Lock, Shield, User, UserMinus, Users } from 'lucide-react'
import { generateInvite, listMembers, removeMember, updateTreePrivacy } from '../api/trees'
import { useAuthStore } from '../store/authStore'

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Открытое', Icon: Globe },
  { value: 'link', label: 'По ссылке', Icon: LinkIcon },
  { value: 'private', label: 'Закрытое', Icon: Lock },
]

const ROLE_LABELS = { owner: 'Совладелец', editor: 'Редактор', reader: 'Читатель' }

export default function InviteManager({ treeId, privacy, onPrivacyUpdated }) {
  const [role, setRole] = useState('editor')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false)

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const currentUserId = useAuthStore((state) => state.userId)

  function loadMembers() {
    setMembersLoading(true)
    listMembers(treeId)
      .then(setMembers)
      .catch(() => setMembersError('Список участников доступен только участникам дерева'))
      .finally(() => setMembersLoading(false))
  }

  useEffect(() => {
    loadMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId])

  async function handleRemoveMember(userId) {
    if (!window.confirm('Убрать этого участника из дерева?')) return
    setRemovingId(userId)
    setMembersError('')
    try {
      await removeMember(treeId, userId)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch {
      setMembersError('Не удалось убрать участника (нужны права владельца)')
    } finally {
      setRemovingId(null)
    }
  }

  async function handlePrivacyClick(value) {
    if (value === privacy) return
    setUpdatingPrivacy(true)
    setError('')
    try {
      await updateTreePrivacy(treeId, value)
      onPrivacyUpdated?.(value)
    } catch {
      setError('Изменить приватность может только владелец дерева')
    } finally {
      setUpdatingPrivacy(false)
    }
  }

  async function handleGenerateInvite() {
    setError('')
    setCopied(false)
    setSubmitting(true)
    try {
      const data = await generateInvite(treeId, { role, email: '' })
      setInviteLink(`${window.location.origin}/invite/${data.token}`)
    } catch {
      setError('Создавать приглашения может только владелец дерева')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-cream-border rounded-[32px] p-6 text-ink space-y-5 shadow-xs">
      <div className="border-b border-cream-border pb-3">
        <h3 className="font-serif font-black text-sm tracking-tight text-ink flex items-center gap-1.5 uppercase">
          <Shield className="h-4 w-4 text-olive" /> Доступ и роли
        </h3>
        <p className="text-[11px] text-ink/65 leading-tight mt-1">Приватность дерева и приглашение новых участников.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-ink/80">Настройки приватности:</label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRIVACY_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => handlePrivacyClick(value)}
              disabled={updatingPrivacy}
              className={`py-2.5 px-1 text-xs rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer bg-white disabled:opacity-50
                ${privacy === value ? 'border-olive bg-olive/5 text-olive font-semibold' : 'border-cream-border text-ink/60 hover:bg-cream-dark'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <label className="block text-xs font-semibold text-ink/80">Пригласить нового родственника:</label>
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-white border border-cream-border rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none"
          >
            <option value="reader">Роль: Читатель</option>
            <option value="editor">Роль: Редактор</option>
            <option value="owner">Роль: Совладелец</option>
          </select>

          <button
            onClick={handleGenerateInvite}
            disabled={submitting}
            className="flex-1 px-3 py-1.5 bg-olive text-white rounded-lg text-xs hover:bg-olive-700 transition flex items-center justify-center gap-1 cursor-pointer font-medium shadow-xs disabled:opacity-55"
          >
            {submitting ? 'Генерируем…' : 'Создать ссылку'}
          </button>
        </div>

        {inviteLink && (
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 border border-cream-border bg-cream-dark/40 rounded-lg text-[10px] font-mono text-olive truncate">
              {inviteLink}
            </div>
            <button
              onClick={handleCopy}
              className="px-2.5 py-2 text-xs bg-white border border-cream-border rounded-lg hover:bg-cream-dark cursor-pointer shrink-0"
              title="Скопировать"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5 text-ink/60" />}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-cream-border">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink/80 pt-3">
          <Users className="h-3.5 w-3.5 text-olive" /> Участники дерева:
        </label>

        {membersLoading ? (
          <p className="text-xs text-ink/40 italic py-3 text-center">Загрузка…</p>
        ) : membersError ? (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
            {membersError}
          </p>
        ) : members.length === 0 ? (
          <p className="text-xs text-ink/40 italic py-3 text-center">Пока только вы.</p>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between gap-2 bg-cream-dark/40 border border-cream-border/60 rounded-lg px-2.5 py-1.5"
              >
                <span className="flex items-center gap-1.5 text-xs text-ink min-w-0">
                  <User className="h-3 w-3 shrink-0 text-ink/40" />
                  <span className="truncate font-medium">{member.username}</span>
                  <span className="shrink-0 text-[9px] font-semibold uppercase text-olive bg-olive/10 rounded-full px-1.5 py-0.5">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </span>
                {member.user_id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingId === member.user_id}
                    title="Убрать из дерева"
                    className="shrink-0 p-1 text-ink/40 hover:text-rose-700 rounded transition cursor-pointer bg-transparent border-0 shadow-none disabled:opacity-50"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
