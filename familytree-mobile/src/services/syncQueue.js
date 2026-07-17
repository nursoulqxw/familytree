import { Platform } from 'react-native';

// Queue stored in localStorage on web, AsyncStorage on native
const QUEUE_KEY = 'ft_sync_queue';

function readQueueSync() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeQueueSync(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

async function readQueueNative() {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueueNative(q) {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function readQueue() {
  if (Platform.OS === 'web') return readQueueSync();
  return readQueueNative();
}

async function writeQueue(q) {
  if (Platform.OS === 'web') return writeQueueSync(q);
  return writeQueueNative(q);
}

export async function enqueue(action) {
  const q = await readQueue();
  q.push({ ...action, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: Date.now() });
  await writeQueue(q);
  return q.length;
}

export async function queueSize() {
  return (await readQueue()).length;
}

const getHandlers = () => {
  const { createPerson, updatePerson } = require('../api/persons');
  const { createRelationship } = require('../api/relationships');
  const { createLifeEvent } = require('../api/lifeEvents');
  return {
    createPerson:       (a) => createPerson(a.treeId, a.payload),
    updatePerson:       (a) => updatePerson(a.treeId, a.personId, a.payload),
    createRelationship: (a) => createRelationship(a.treeId, a.payload),
    createLifeEvent:    (a) => createLifeEvent(a.treeId, a.personId, a.payload),
  };
};

export async function processQueue(onProgress) {
  const queue = await readQueue();
  const remaining = [];
  let processed = 0, failed = false;
  const HANDLERS = getHandlers();
  for (const action of queue) {
    if (failed) { remaining.push(action); continue; }
    const handler = HANDLERS[action.type];
    if (!handler) continue;
    try {
      await handler(action);
      processed++;
      onProgress?.({ processed, total: queue.length });
    } catch {
      failed = true;
      remaining.push(action);
    }
  }
  await writeQueue(remaining);
  return { processed, remaining: remaining.length };
}