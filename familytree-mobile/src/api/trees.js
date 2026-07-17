import client from '../services/apiClient';
export const listTrees         = ()                    => client.get('/trees/').then(r => r.data);
export const createTree        = (data)                => client.post('/trees/', data).then(r => r.data);
export const deleteTree        = (id)                  => client.delete(`/trees/${id}/`).then(r => r.data);
export const fullTree          = (id)                  => client.get(`/trees/${id}/full_tree/`).then(r => r.data);
export const getTree           = (id)                  => client.get(`/trees/${id}/`).then(r => r.data);
export const generateInvite    = (id, data)            => client.post(`/trees/${id}/generate_invite/`, data).then(r => r.data);
export const updateTreePrivacy = (id, privacy)         => client.patch(`/trees/${id}/`, { privacy }).then(r => r.data);