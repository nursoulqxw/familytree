import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

// Web storage using localStorage
const webStorage = {
  getItem: (key) => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); }
    catch {}
    return Promise.resolve();
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); }
    catch {}
    return Promise.resolve();
  },
};

// Native storage using expo-secure-store
const nativeStorage = {
  getItem: async (key) => {
    const SecureStore = require('expo-secure-store');
    try { return await SecureStore.getItemAsync(key); }
    catch { return null; }
  },
  setItem: async (key, value) => {
    const SecureStore = require('expo-secure-store');
    try { await SecureStore.setItemAsync(key, value); }
    catch {}
  },
  removeItem: async (key) => {
    const SecureStore = require('expo-secure-store');
    try { await SecureStore.deleteItemAsync(key); }
    catch {}
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      userId:       null,
      username:     null,
      hasHydrated:  false,

      loginSuccess: (data, usernameFallback) => set({
        accessToken:  data.access,
        refreshToken: data.refresh ?? null,
        userId:       data.user_id ?? null,
        username:     data.username ?? usernameFallback ?? null,
      }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        userId: null,
        username: null,
      }),

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'familytree-auth',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);