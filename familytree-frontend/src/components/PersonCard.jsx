function yearOf(dateString) {
  return dateString ? dateString.slice(0, 4) : '?'
}

export default function PersonCard({ person, onEdit, onDelete }) {
  const years = person.birth_date || person.death_date ? `${yearOf(person.birth_date)} – ${yearOf(person.death_date)}` : null

  return (
    <div className="border border-cream-border rounded-2xl p-5 text-center bg-white">
      {person.photo ? (
        <img
          className="h-20 w-20 rounded-full object-cover mx-auto mb-2.5 border-2 border-cream-dark"
          src={person.photo}
          alt={`${person.first_name} ${person.last_name}`}
        />
      ) : (
        <div
          className="h-20 w-20 rounded-full mx-auto mb-2.5 border-2 border-cream-dark flex items-center justify-center bg-olive/10 text-olive font-serif font-black text-xl"
          aria-hidden="true"
        >
          {person.first_name?.[0]}
          {person.last_name?.[0]}
        </div>
      )}

      <h3 className="font-serif font-bold text-ink">
        {person.first_name} {person.last_name}
      </h3>
      {years && <p className="text-ink/60 text-sm">{years}</p>}
      {person.bio && <p className="text-ink/70 text-xs mt-1.5">{person.bio.slice(0, 140)}</p>}

      <div className="flex gap-2 justify-center mt-3">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="text-xs font-medium border border-cream-border bg-white hover:bg-cream-dark px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Редактировать
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(person.id)}
            className="text-xs font-medium text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}
