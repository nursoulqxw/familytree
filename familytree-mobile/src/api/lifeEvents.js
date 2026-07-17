import client from '../services/apiClient';
export const listLifeEvents   = (treeId, pId)       => client.get(`/trees/${treeId}/persons/${pId}/life-events/`).then(r => r.data);
export const createLifeEvent  = (treeId, pId, data) => client.post(`/trees/${treeId}/persons/${pId}/life-events/`, data).then(r => r.data);
export const deleteLifeEvent  = (treeId, pId, id)   => client.delete(`/trees/${treeId}/persons/${pId}/life-events/${id}/`).then(r => r.data);