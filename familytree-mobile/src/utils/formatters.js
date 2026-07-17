export const formatDate      = (d) => { if (!d) return ''; const [y,m,dd] = d.split('-'); return `${dd}.${m}.${y}`; };
export const formatYear      = (d) => d ? d.slice(0, 4) : '????';
export const fullName        = (p) => [p.last_name, p.first_name, p.patronymic].filter(Boolean).join(' ');
export const initials        = (p) => `${p.first_name?.[0]||''}${p.last_name?.[0]||''}`.toUpperCase();
export const parseDateInput  = (t) => { const m = t?.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
export const toDateInputText = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}.${m}.${y}`; };