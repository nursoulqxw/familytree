import { useState } from 'react'
import { useTranslation } from '../i18n/useTranslation'

function extraDataToRows(extraData) {
  if (!extraData || typeof extraData !== 'object') return []
  return Object.entries(extraData).map(([key, value]) => ({ key, value: String(value) }))
}

function rowsToExtraData(rows) {
  const result = {}
  rows.forEach(({ key, value }) => {
    if (key.trim()) result[key.trim()] = value
  })
  return result
}

const inputClass =
  'w-full text-sm bg-cream-light rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive text-ink'
const labelClass = 'block text-xs font-semibold text-ink/70 mb-1'

export default function PersonForm({ initialPerson, onSubmit, onCancel, onDelete, submitting }) {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState(initialPerson?.first_name ?? '')
  const [lastName, setLastName] = useState(initialPerson?.last_name ?? '')
  const [patronymic, setPatronymic] = useState(initialPerson?.patronymic ?? '')
  const [gender, setGender] = useState(initialPerson?.gender ?? '')
  const [birthDate, setBirthDate] = useState(initialPerson?.birth_date ?? '')
  const [deathDate, setDeathDate] = useState(initialPerson?.death_date ?? '')
  const [birthPlace, setBirthPlace] = useState(initialPerson?.birth_place ?? '')
  const [bio, setBio] = useState(initialPerson?.bio ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initialPerson?.photo ?? null)
  const [extraRows, setExtraRows] = useState(extraDataToRows(initialPerson?.extra_data))
  const [error, setError] = useState('')

  const isEdit = Boolean(initialPerson?.id)

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function updateRow(index, field, value) {
    setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setExtraRows((rows) => [...rows, { key: '', value: '' }])
  }

  function removeRow(index) {
    setExtraRows((rows) => rows.filter((_, i) => i !== index))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError(t('personForm.requiredError'))
      return
    }
    if (birthDate && deathDate && deathDate < birthDate) {
      setError(t('personForm.dateError'))
      return
    }

    const data = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      patronymic: patronymic.trim(),
      gender,
      birth_date: birthDate || null,
      death_date: deathDate || null,
      birth_place: birthPlace.trim(),
      bio,
      extra_data: rowsToExtraData(extraRows),
    }
    if (photoFile) {
      data.photo = photoFile
    }

    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="person-first-name" className={labelClass}>
            {t('common.firstName')}
          </label>
          <input
            id="person-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="person-last-name" className={labelClass}>
            {t('common.lastName')}
          </label>
          <input
            id="person-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="person-patronymic" className={labelClass}>
            {t('common.patronymic')}
          </label>
          <input
            id="person-patronymic"
            value={patronymic}
            onChange={(e) => setPatronymic(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="person-gender" className={labelClass}>
            {t('common.gender')}
          </label>
          <select id="person-gender" value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
            <option value="">{t('common.genderUnset')}</option>
            <option value="M">{t('common.genderMale')}</option>
            <option value="F">{t('common.genderFemale')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="person-birth-date" className={labelClass}>
            {t('common.birthDate')}
          </label>
          <input
            id="person-birth-date"
            type="date"
            value={birthDate ?? ''}
            onChange={(e) => setBirthDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="person-death-date" className={labelClass}>
            {t('common.deathDate')}
          </label>
          <input
            id="person-death-date"
            type="date"
            value={deathDate ?? ''}
            onChange={(e) => setDeathDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="person-birth-place" className={labelClass}>
          {t('common.birthPlace')}
        </label>
        <input
          id="person-birth-place"
          value={birthPlace}
          onChange={(e) => setBirthPlace(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="person-bio" className={labelClass}>
          {t('common.bio')}
        </label>
        <textarea
          id="person-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="person-photo" className={labelClass}>
          {t('common.photo')}
        </label>
        <input
          id="person-photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-olive/10 file:text-olive file:cursor-pointer"
        />
        {photoPreview && (
          <img className="h-24 w-24 object-cover rounded-xl mt-2 border border-cream-border" src={photoPreview} alt={t('common.preview')} />
        )}
      </div>

      <fieldset className="border border-cream-border rounded-xl p-3.5">
        <legend className="text-xs font-semibold text-ink/70 px-1.5">{t('personForm.extraFieldsLegend')}</legend>
        <div className="space-y-2">
          {extraRows.map((row, index) => (
            <div className="flex gap-2 items-center" key={index}>
              <input
                placeholder={t('common.name')}
                value={row.key}
                onChange={(e) => updateRow(index, 'key', e.target.value)}
                className={inputClass}
              />
              <input
                placeholder={t('personForm.valuePlaceholder')}
                value={row.value}
                onChange={(e) => updateRow(index, 'value', e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={t('personForm.removeFieldAria')}
                className="shrink-0 text-ink/50 hover:text-rose-700 bg-transparent border-0 shadow-none text-lg leading-none px-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-xs font-semibold text-olive bg-olive/10 hover:bg-olive/20 px-3 py-1.5 rounded-md cursor-pointer"
        >
          {t('personForm.addField')}
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
          {error}
        </p>
      )}

      <div className="flex gap-2 flex-wrap pt-2 border-t border-cream-border justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-ink/70 hover:bg-cream-dark rounded-md cursor-pointer bg-transparent border-0 shadow-none"
        >
          {t('common.cancel')}
        </button>
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(initialPerson.id)}
            className="px-4 py-2 text-xs font-medium text-rose-700 border border-rose-200 bg-cream-light hover:bg-rose-50 rounded-md cursor-pointer"
          >
            {t('common.delete')}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-xs font-semibold bg-olive text-white rounded-md hover:bg-olive-700 shadow-xs cursor-pointer disabled:opacity-55"
        >
          {isEdit ? t('common.save') : t('personForm.addPerson')}
        </button>
      </div>
    </form>
  )
}
