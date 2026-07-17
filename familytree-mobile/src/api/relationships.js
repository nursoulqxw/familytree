import client from '../services/apiClient';
export const createRelationship = (treeId, data) => client.post(`/trees/${treeId}/relationships/`, data).then(r => r.data);
export const deleteRelationship = (treeId, id)   => client.delete(`/trees/${treeId}/relationships/${id}/`).then(r => r.data);