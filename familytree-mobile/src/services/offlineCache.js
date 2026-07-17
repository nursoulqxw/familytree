import { Platform } from 'react-native';

// AsyncStorage crashes on web in some Metro bundler versions.
// Use a simple in-memory + localStorage cache on web instead.

const PREFIX = 'ft_cache:';

function webSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, cachedAt: Date.now() }));
  } catch {}
}

function webGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function nativeSet(key, value) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ value, cachedAt: Date.now() }));
  } catch (e) { console.warn('cacheSet failed', key, e); }
}

async function nativeGet(key) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function cacheSet(key, value) {
  if (Platform.OS === 'web') return webSet(key, value);
  return nativeSet(key, value);
}

export async function cacheGet(key) {
  if (Platform.OS === 'web') return webGet(key);
  return nativeGet(key);
}

export const cacheKeys = {
  treeList:   ()            => 'trees:list',
  fullTree:   (treeId)      => `tree:${treeId}:full`,
  lifeEvents: (treeId, pId) => `tree:${treeId}:person:${pId}:events`,
};