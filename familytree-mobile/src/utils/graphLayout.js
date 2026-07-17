export const RELATIONSHIP_LABELS = { parent:'Родитель', child:'Ребёнок', spouse:'Супруг(а)', sibling:'Брат/Сестра' };

export const RELATION_OPTIONS = [
  { value: 'CHILD',   label: 'Ребёнок для выбранного' },
  { value: 'PARENT',  label: 'Родитель для выбранного' },
  { value: 'SPOUSE',  label: 'Супруг(а) выбранного' },
  { value: 'SIBLING', label: 'Брат/сестра выбранного' },
];

export function relationshipArgsFor(relType, newId, connectToId) {
  switch (relType) {
    case 'CHILD':   return { person_from: connectToId, person_to: newId,       relationship_type: 'parent' };
    case 'PARENT':  return { person_from: newId,       person_to: connectToId, relationship_type: 'parent' };
    case 'SPOUSE':  return { person_from: connectToId, person_to: newId,       relationship_type: 'spouse' };
    case 'SIBLING': return { person_from: connectToId, person_to: newId,       relationship_type: 'sibling' };
    default: return null;
  }
}

export const NODE_WIDTH  = 160;
export const NODE_HEIGHT = 92;
const LEVEL_HEIGHT = 200;
const BLOCK_WIDTH  = 260;

function normalizeParentLinks(rels) {
  return rels
    .filter(r => r.relationship_type === 'parent' || r.relationship_type === 'child')
    .map(r => r.relationship_type === 'parent'
      ? { id: r.id, parentId: String(r.person_from), childId: String(r.person_to) }
      : { id: r.id, parentId: String(r.person_to),   childId: String(r.person_from) });
}

export function resolvePositions(persons, relationships) {
  const parentLinks  = normalizeParentLinks(relationships);
  const spouseLinks  = relationships.filter(r => r.relationship_type === 'spouse');
  const siblingLinks = relationships.filter(r => r.relationship_type === 'sibling');

  const levels = {};
  const childIds = new Set(parentLinks.map(l => l.childId));
  const roots = persons.filter(p => !childIds.has(String(p.id)));

  const resolveLevel = (id, lvl, visited = new Set()) => {
    if (visited.has(id)) return;
    visited.add(id);
    levels[id] = Math.max(levels[id] || 0, lvl);
    parentLinks.filter(l => l.parentId === id).forEach(l => resolveLevel(l.childId, lvl + 1, visited));
  };
  roots.forEach(p => resolveLevel(String(p.id), 0));

  [...spouseLinks, ...siblingLinks].forEach(r => {
    const a = String(r.person_from), b = String(r.person_to);
    const lvl = Math.max(levels[a] || 0, levels[b] || 0);
    levels[a] = lvl; levels[b] = lvl;
  });
  persons.forEach(p => { if (levels[String(p.id)] === undefined) levels[String(p.id)] = 0; });

  const maxLvl = Math.max(0, ...Object.values(levels));
  const positions = {};

  for (let lvl = 0; lvl <= maxLvl; lvl++) {
    const lvlPersons = persons.filter(p => levels[String(p.id)] === lvl);
    const blocks = [];
    const done = new Set();
    lvlPersons.forEach(p => {
      const id = String(p.id);
      if (done.has(id)) return;
      const sr = spouseLinks.find(r => String(r.person_from) === id || String(r.person_to) === id);
      const spouseId = sr ? (String(sr.person_from) === id ? String(sr.person_to) : String(sr.person_from)) : null;
      const spouseObj = spouseId ? lvlPersons.find(s => String(s.id) === spouseId) : null;
      if (spouseObj) { blocks.push([p, spouseObj]); done.add(id); done.add(spouseId); }
      else           { blocks.push([p]);             done.add(id); }
    });
    const mid = (blocks.length - 1) / 2;
    blocks.forEach((blk, i) => {
      const bx = 450 + (i - mid) * BLOCK_WIDTH;
      const by = 80  + lvl * LEVEL_HEIGHT;
      if (blk.length === 2) {
        positions[String(blk[0].id)] = { x: bx - 100, y: by };
        positions[String(blk[1].id)] = { x: bx + 100, y: by };
      } else {
        positions[String(blk[0].id)] = { x: bx, y: by };
      }
    });
  }
  return { positions, levels };
}

export function canvasBounds(positions) {
  const xs = Object.values(positions).map(p => p.x);
  const ys = Object.values(positions).map(p => p.y);
  if (xs.length === 0) return { minX: 0, maxX: 900, minY: 0, maxY: 600 };
  return {
    minX: Math.min(0, ...xs) - NODE_WIDTH,
    maxX: Math.max(NODE_WIDTH, ...xs) + NODE_WIDTH,
    minY: Math.min(0, ...ys) - NODE_HEIGHT,
    maxY: Math.max(NODE_HEIGHT, ...ys) + NODE_HEIGHT,
  };
}