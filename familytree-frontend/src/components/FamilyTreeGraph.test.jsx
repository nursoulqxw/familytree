import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FamilyTreeGraph, { RELATIONSHIP_LABELS } from './FamilyTreeGraph'

describe('FamilyTreeGraph', () => {
  const persons = [
    { id: 1, first_name: 'Анна', last_name: 'Иванова', birth_date: '1950-01-01', death_date: null, photo: null },
    { id: 2, first_name: 'Борис', last_name: 'Иванов', birth_date: '1948-01-01', death_date: '2010-01-01', photo: null },
  ]
  const relationships = [{ id: 10, person_from: 2, person_to: 1, relationship_type: 'spouse' }]

  function renderGraph(props = {}) {
    return render(
      <FamilyTreeGraph
        persons={persons}
        relationships={relationships}
        selectedId={null}
        onSelectMember={vi.fn()}
        onAddMember={vi.fn()}
        searchQuery=""
        setSearchQuery={vi.fn()}
        {...props}
      />,
    )
  }

  it('exposes relationship type labels used by RelationshipModal', () => {
    expect(RELATIONSHIP_LABELS).toEqual({
      parent: 'Родитель',
      child: 'Ребёнок',
      spouse: 'Супруг(а)',
      sibling: 'Брат/Сестра',
    })
  })

  it('renders a card for every person with name and lifespan', () => {
    renderGraph()

    expect(screen.getByText('Анна')).toBeInTheDocument()
    expect(screen.getByText('Иванова')).toBeInTheDocument()
    expect(screen.getByText('1950')).toBeInTheDocument()
    // жив(а) — второй год не показываем, только тире "— наст."
    expect(screen.getByText('— наст.')).toBeInTheDocument()
    // Борис умер в 2010 — показываем год смерти
    expect(screen.getByText('— 2010')).toBeInTheDocument()
  })

  it('calls onSelectMember with the person id as a string when a card is clicked', async () => {
    const onSelectMember = vi.fn()
    const user = userEvent.setup()
    renderGraph({ onSelectMember })

    await user.click(screen.getByText('Анна'))

    expect(onSelectMember).toHaveBeenCalledWith('1')
  })

  it('opens the add-member modal and submits new person data with the chosen relation', async () => {
    const onAddMember = vi.fn()
    const user = userEvent.setup()
    renderGraph({ onAddMember, selectedId: 1 })

    await user.click(screen.getByRole('button', { name: /добавить родственника/i }))
    await user.type(screen.getByLabelText(/фамилия/i), 'Петров')
    await user.type(screen.getByLabelText(/^имя/i), 'Пётр')
    await user.click(screen.getByRole('button', { name: /внедрить в древо/i }))

    expect(onAddMember).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Пётр', last_name: 'Петров' }),
      '1',
      'CHILD',
    )
  })
})
