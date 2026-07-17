import { useState } from 'react'
import { createPerson, deletePerson, updatePerson } from '../api/persons'
import { useTranslation } from '../i18n/useTranslation'
import Modal from './Modal'
import PersonForm from './PersonForm'

export default function PersonModal({ treeId, person, onClose, onSaved, onDeleted }) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(person?.id)

  async function handleSubmit(data) {
    setSubmitting(true)
    setError('')
    try {
      if (isEdit) {
        await updatePerson(treeId, person.id, data)
      } else {
        await createPerson(treeId, data)
      }
      onSaved()
    } catch (err) {
      const detail = err.response?.data
      const message = detail ? Object.values(detail).flat().join(' ') : t('personModal.saveError')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(personId) {
    if (!window.confirm(t('personModal.deleteConfirm'))) return
    setSubmitting(true)
    setError('')
    try {
      await deletePerson(treeId, personId)
      onDeleted()
    } catch {
      setError(t('personModal.deleteError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? t('personModal.editTitle') : t('personModal.addTitle')} onClose={onClose}>
      {error && (
        <p role="alert" className="text-rose-900 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs mb-3">
          {error}
        </p>
      )}
      <PersonForm
        initialPerson={person}
        onSubmit={handleSubmit}
        onCancel={onClose}
        onDelete={isEdit ? handleDelete : undefined}
        submitting={submitting}
      />
    </Modal>
  )
}
