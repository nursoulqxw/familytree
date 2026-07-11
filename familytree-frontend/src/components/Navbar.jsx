import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function Navbar({ children }) {
  return (
    <header className="bg-white border-b border-cream-border py-4 px-6 md:px-8 shrink-0 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <Link to="/dashboard" className="flex items-center gap-3 no-underline">
        <div className="h-10 w-10 bg-olive text-white rounded-lg flex items-center justify-center shadow-xs shrink-0">
          <BookOpen className="h-5.5 w-5.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-black text-lg md:text-xl tracking-tight text-ink">Родовое древо</h1>
            <span className="text-[10px] font-semibold bg-olive/10 text-olive px-2 py-0.5 rounded font-mono hidden sm:inline">
              ЦИФРОВОЙ АРХИВ
            </span>
          </div>
          <p className="text-xs text-ink/65 leading-none mt-1 hidden md:block">
            Семейная летопись, хроника и архив медиа
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3 justify-between md:justify-end shrink-0 text-xs">{children}</div>
    </header>
  )
}
