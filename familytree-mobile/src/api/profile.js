import client from '../services/apiClient';

/**
 * GET /api/auth/me/
 */
export const getMyProfile = () =>
  client.get('/auth/me/').then(r => r.data);

/**
 * PATCH /api/auth/me/
 */
export const updateMyProfile = (data) =>
  client.patch('/auth/me/', data).then(r => r.data);

/**
 * POST /api/auth/change-password/
 */
export const changePassword = (oldPassword, newPassword) =>
  client.post('/auth/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  }).then(r => r.data);