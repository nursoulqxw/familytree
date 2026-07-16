import { useState } from 'react'
import { createRelationship } from '../api/relationships'
import { useTranslation } from '../i18n/useTranslation'
import { RELATIONSHIP_LABELS } from './FamilyTreeGraph'
import Modal from './Modal'

const selectClass =
  'w-full text-sm bg-cream-light text-ink rounded-md border border-cream-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive'
const labelClass = 'block text-xs font-semibold text-ink/70 mb-1'

export default function RelationshipModal({ treeId, persons, relationships, onClose, onSaved }) {
  const { t } = useTranslation()
  // RELATIONSHIP_LABELS сам остаётся внутренним ru-словарём (на нём завязан
  // FamilyTreeGraph.test.jsx) — здесь берём только ключи, подписи переводим отдельно
  const relationshipLabels = Object.fromEntries(Object.keys(RELATIONSHIP_LABELS).map((key) => [key, t(`rel.${key}`)]))
  const [personFrom, setPersonFrom] = useState('')
  const [personTo, setPersonTo] = useState('')
  const [relationshipType, setRelationshipType] = useState('parent')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!personFrom || !personTo) {
      setError(t('relModal.selectBothError'))
      return
    }
    if (personFrom === personTo) {
      setError(t('relModal.selfError'))
      return
    }

    const duplicate = relationships.some(
      (r) =>
        String(r.person_from) === personFrom &&
        String(r.person_to) === personTo &&
        r.relationship_type === relationshipType,
    )
    if (duplicate) {
      setError(t('relModal.duplicateError'))
      return
    }

    setSubmitting(true)
    try {
      await createRelationship(treeId, {
        person_from: Number(personFrom),
        person_to: Number(personTo),
        relationship_type: relationshipType,
      })
      onSaved()
    } catch {
      setError(t('relModal.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={t('relModal.title')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="rel-from" className={labelClass}>
            {t('relModal.person')}
          </label>
          <select id="rel-from" value={personFrom} onChange={(e) => setPersonFrom(e.target.value)} required className={selectClass}>
            <option value="" disabled>
              {t('relModal.choosePerson')}
            </option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.first_name} {person.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rel-type" className={labelClass}>
            {t('relModal.type')}
          </label>
          <select id="rel-type" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)} className={selectClass}>
            {Object.entries(relationshipLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rel-to" className={labelClass}>
            {t('relModal.relatesTo')}
          </label>
          <select id="rel-to" value={personTo} onChange={(e) => setPersonTo(e.target.value)} required className={selectClass}>
            <option value="" disabled>
              {t('relModal.choosePerson')}
            </option>
            {persons
              .filter((person) => String(person.id) !== personFrom)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-cream-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-ink/70 hover:bg-cream-dark rounded-md cursor-pointer bg-transparent border-0 shadow-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold bg-olive text-white rounded-md hover:bg-olive-700 shadow-xs cursor-pointer disabled:opacity-55"
          >
            {t('common.addRelationship')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
