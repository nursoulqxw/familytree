import client from '../services/apiClient';
export const listMedia   = (treeId, pId)          => client.get(`/trees/${treeId}/persons/${pId}/media/`).then(r => r.data);
export const uploadMedia = (treeId, pId, { file, caption }) => {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.fileName || 'media.jpg', type: file.mimeType || 'image/jpeg' });
  if (caption) form.append('caption', caption);
  return client.post(`/trees/${treeId}/persons/${pId}/media/`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteMedia = (treeId, pId, id)      => client.delete(`/trees/${treeId}/persons/${pId}/media/${id}/`).then(r => r.data);