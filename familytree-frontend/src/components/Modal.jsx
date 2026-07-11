export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream border border-cream-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-olive px-5 py-4 text-white flex justify-between items-center">
          <h2 className="font-serif font-black text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="text-white/80 hover:text-white font-sans text-xl font-bold cursor-pointer bg-transparent border-0 p-0 shadow-none"
          >
            &times;
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto text-ink">{children}</div>
      </div>
    </div>
  )
}
