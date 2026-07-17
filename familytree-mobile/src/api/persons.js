import client from '../services/apiClient';

function toBody(data) {
  const hasPhoto = data.photo && data.photo.uri;
  if (!hasPhoto) {
    const { photo: _, ...rest } = data;
    return rest;
  }
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v == null) return;
    if (k === 'photo') form.append('photo', { uri: v.uri, name: v.fileName || 'photo.jpg', type: v.mimeType || 'image/jpeg' });
    else form.append(k, String(v));
  });
  return form;
}
const cfg = (b) => b instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

export const createPerson  = (treeId, data)           => { const b = toBody(data); return client.post(`/trees/${treeId}/persons/`, b, cfg(b)).then(r => r.data); };
export const updatePerson  = (treeId, personId, data) => { const b = toBody(data); return client.patch(`/trees/${treeId}/persons/${personId}/`, b, cfg(b)).then(r => r.data); };
export const deletePerson  = (treeId, personId)       => client.delete(`/trees/${treeId}/persons/${personId}/`).then(r => r.data);
export const ancestors     = (treeId, personId)       => client.get(`/trees/${treeId}/persons/${personId}/ancestors/`).then(r => r.data);
export const descendants   = (treeId, personId)       => client.get(`/trees/${treeId}/persons/${personId}/descendants/`).then(r => r.data);