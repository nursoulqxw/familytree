import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const LANGUAGES = ['ru', 'kk', 'en']

function resolveStorage() {
  try {
    window.localStorage.setItem('__familytree_ui_check__', '1')
    window.localStorage.removeItem('__familytree_ui_check__')
    return window.localStorage
  } catch {
    const memory = new Map()
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    }
  }
}

export const useUiStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'ru',
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setLanguage: (language) => set({ language: LANGUAGES.includes(language) ? language : 'ru' }),
    }),
    { name: 'familytree-ui', storage: createJSONStorage(resolveStorage) },
  ),
)
