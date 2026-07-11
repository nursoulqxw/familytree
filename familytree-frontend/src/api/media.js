import client from './client'

export function listMedia(treeId, personId) {
  return client.get(`/trees/${treeId}/persons/${personId}/media/`).then((res) => res.data)
}

export function uploadMedia(treeId, personId, { file, caption }) {
  const form = new FormData()
  form.append('file', file)
  if (caption) form.append('caption', caption)
  return client.post(`/trees/${treeId}/persons/${personId}/media/`, form).then((res) => res.data)
}

export function deleteMedia(treeId, personId, mediaId) {
  return client.delete(`/trees/${treeId}/persons/${personId}/media/${mediaId}/`).then((res) => res.data)
}
