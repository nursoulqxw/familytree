import client from './client'

export function register({ username, email, password }) {
  return client.post('/auth/register/', { username, email, password }).then((res) => res.data)
}

export function login({ username, password }) {
  return client.post('/auth/login/', { username, password }).then((res) => res.data)
}

export function fetchProfile() {
  return client.get('/auth/me/').then((res) => res.data)
}

export function updateProfile({ first_name, last_name }) {
  return client.patch('/auth/me/', { first_name, last_name }).then((res) => res.data)
}

export function changePassword({ old_password, new_password }) {
  return client.post('/auth/change-password/', { old_password, new_password }).then((res) => res.data)
}
