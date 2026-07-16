import { useUiStore } from '../store/uiStore'
import { translations } from './translations'

/** t('key', {n: 5}) — строка на текущем языке (uiStore.language) с подстановкой {n} на 5;
 * если ключа нет в этом языке — берётся ru, если и там нет — возвращается сам ключ. */
export function useTranslation() {
  const language = useUiStore((state) => state.language)
  const setLanguage = useUiStore((state) => state.setLanguage)

  function t(key, params) {
    const raw = translations[language]?.[key] ?? translations.ru[key] ?? key
    if (!params) return raw
    return Object.entries(params).reduce((str, [k, v]) => str.replaceAll(`{${k}}`, v), raw)
  }

  return { t, language, setLanguage }
}
