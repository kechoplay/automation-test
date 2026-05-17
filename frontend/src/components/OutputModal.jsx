export default function OutputModal({ output, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <span className="font-semibold text-white">Test Output</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <pre className="flex-1 overflow-auto p-5 text-xs font-mono text-slate-300 whitespace-pre-wrap">
          {output || '(no output)'}
        </pre>
      </div>
    </div>
  )
}
