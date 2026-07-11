import client from './client'

export function listLifeEvents(treeId, personId) {
  return client.get(`/trees/${treeId}/persons/${personId}/life-events/`).then((res) => res.data)
}

export function createLifeEvent(treeId, personId, { title, description, event_date }) {
  return client
    .post(`/trees/${treeId}/persons/${personId}/life-events/`, { title, description, event_date })
    .then((res) => res.data)
}

export function deleteLifeEvent(treeId, personId, eventId) {
  return client.delete(`/trees/${treeId}/persons/${personId}/life-events/${eventId}/`).then((res) => res.data)
}
