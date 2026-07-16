import { Link } from 'react-router-dom'
import { BookOpen, CircleUserRound, Moon, Sun } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { LANGUAGES, useUiStore } from '../store/uiStore'

const LANGUAGE_LABELS = { ru: 'РУС', kk: 'ҚАЗ', en: 'ENG' }

export default function Navbar({ children }) {
  const { t, language, setLanguage } = useTranslation()
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)

  return (
    <header className="bg-cream-light border-b border-cream-border py-4 px-6 md:px-8 shrink-0 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <Link to="/dashboard" className="flex items-center gap-3 no-underline">
        <div className="h-10 w-10 bg-olive text-white rounded-lg flex items-center justify-center shadow-xs shrink-0">
          <BookOpen className="h-5.5 w-5.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-black text-lg md:text-xl tracking-tight text-ink">{t('brand.name')}</h1>
            <span className="text-[10px] font-semibold bg-olive/10 text-olive px-2 py-0.5 rounded font-mono hidden sm:inline">
              {t('brand.badge')}
            </span>
          </div>
          <p className="text-xs text-ink/65 leading-none mt-1 hidden md:block">{t('brand.subtitle')}</p>
        </div>
      </Link>

      <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 text-xs">
        {children}

        <div className="flex items-center gap-0.5 bg-cream-dark border border-cream-border rounded-lg p-0.5" role="group" aria-label={t('nav.language')}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              title={lang}
              className={`px-1.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition bg-transparent border-0 shadow-none
                ${language === lang ? 'bg-olive text-white' : 'text-ink/50 hover:text-ink'}`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? t('nav.themeDark') : t('nav.themeLight')}
          className="p-2 text-ink/50 hover:text-olive hover:bg-cream-dark rounded-lg transition shrink-0 cursor-pointer bg-transparent border-0 shadow-none"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <Link
          to="/profile"
          title={t('nav.profile')}
          className="p-2 text-ink/50 hover:text-olive hover:bg-cream-dark rounded-lg transition shrink-0"
        >
          <CircleUserRound className="h-5 w-5" />
        </Link>
      </div>
    </header>
  )
}
