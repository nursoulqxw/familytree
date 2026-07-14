import { useEffect, useState } from 'react'
import { Check, KeyRound, User } from 'lucide-react'
import { changePassword, fetchProfile, updateProfile } from '../api/auth'
import Navbar from '../components/Navbar'

const inputClass =
  'w-full text-sm bg-white rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink'
const labelClass = 'block text-xs font-semibold text-ink/70 mb-1'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setProfile(data)
        setFirstName(data.first_name)
        setLastName(data.last_name)
      })
      .catch(() => setProfileError('Не удалось загрузить профиль'))
  }, [])

  async function handleSaveProfile(event) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    setProfileSaved(false)
    try {
      const updated = await updateProfile({ first_name: firstName, last_name: lastName })
      setProfile(updated)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch {
      setProfileError('Не удалось сохранить профиль')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordChanged(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChanged(true)
      setTimeout(() => setPasswordChanged(false), 2500)
    } catch (err) {
      const detail = err.response?.data
      const message = detail ? Object.values(detail).flat().join(' ') : 'Не удалось сменить пароль'
      setPasswordError(message)
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-6">
          <h1 className="font-serif font-black text-2xl text-ink">Профиль</h1>
        </header>

        {!profile ? (
          <p className="text-ink/60">{profileError || 'Загрузка…'}</p>
        ) : (
          <div className="space-y-6">
            <section className="bg-white border border-cream-border rounded-2xl p-5 shadow-xs">
              <h2 className="font-serif font-black text-sm uppercase tracking-tight text-ink mb-3 flex items-center gap-1.5">
                <User className="h-4 w-4 text-olive" /> Основное
              </h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Имя пользователя</label>
                  <input value={profile.username} disabled className={`${inputClass} bg-cream-dark text-ink/50`} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={profile.email || '—'} disabled className={`${inputClass} bg-cream-dark text-ink/50`} />
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="profile-first-name" className={labelClass}>
                      Имя
                    </label>
                    <input
                      id="profile-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-last-name" className={labelClass}>
                      Фамилия
                    </label>
                    <input
                      id="profile-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {profileError && (
                  <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
                    {profileError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 text-xs font-semibold bg-olive text-white rounded-md hover:bg-olive-700 shadow-xs cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
                  >
                    {profileSaved && <Check className="h-3.5 w-3.5" />}
                    {savingProfile ? 'Сохраняем…' : profileSaved ? 'Сохранено' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </section>

            <section className="bg-white border border-cream-border rounded-2xl p-5 shadow-xs">
              <h2 className="font-serif font-black text-sm uppercase tracking-tight text-ink mb-3 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-olive" /> Смена пароля
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                <div>
                  <label htmlFor="old-password" className={labelClass}>
                    Текущий пароль
                  </label>
                  <input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className={labelClass}>
                    Новый пароль
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className={labelClass}>
                    Повторите новый пароль
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                {passwordError && (
                  <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-4 py-2 text-xs font-semibold bg-olive text-white rounded-md hover:bg-olive-700 shadow-xs cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
                  >
                    {passwordChanged && <Check className="h-3.5 w-3.5" />}
                    {changingPassword ? 'Меняем…' : passwordChanged ? 'Пароль изменён' : 'Сменить пароль'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
