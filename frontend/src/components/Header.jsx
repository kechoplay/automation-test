export default function Header({ page, setPage }) {
  const active = 'px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white'
  const inactive = 'px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700'

  return (
    <header className="flex items-center justify-between px-5 py-2.5 border-b border-slate-700/60 bg-slate-900 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">AT</div>
        <span className="font-semibold text-white">AutoTest API</span>
      </div>
      <nav className="flex gap-1">
        <button onClick={() => setPage('new')} className={page === 'new' ? active : inactive}>New Test</button>
        <button onClick={() => setPage('history')} className={page === 'history' ? active : inactive}>History</button>
      </nav>
    </header>
  )
}
