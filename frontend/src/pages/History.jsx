import { useState, useEffect } from 'react'
import api from '../api'
import OutputModal from '../components/OutputModal'

const METHOD_COLOR = {
  GET: '#34d399', POST: '#fbbf24', PUT: '#60a5fa', PATCH: '#a78bfa', DELETE: '#f87171',
}
const STATUS_CLASS = {
  passed: 'bg-emerald-950 text-emerald-400',
  failed: 'bg-red-950 text-red-400',
  running: 'bg-blue-950 text-blue-400',
  error: 'bg-red-950 text-yellow-400',
}

const fmtDate = (iso) => iso ? new Date(iso + 'Z').toLocaleString('vi-VN') : '—'

export default function History({ showToast, onRerun }) {
  const [rows, setRows] = useState([])
  const [modalOutput, setModalOutput] = useState(null)

  const load = () => api.getHistory().then(setRows)
  useEffect(() => { load() }, [])

  const handleViewOutput = async (id) => {
    const data = await api.getRunOutput(id)
    setModalOutput(data.output || '(no output)')
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa lịch sử này?')) return
    await api.deleteRun(id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleRerun = async (id) => {
    try {
      const { run_id } = await api.rerun(id)
      onRerun(run_id)
    } catch {
      showToast('Re-run thất bại')
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60 bg-slate-900 shrink-0">
        <h2 className="font-semibold text-white">Test History</h2>
        <button onClick={load} className="text-sm text-indigo-400 hover:text-indigo-300">↻ Refresh</button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {rows.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-20">Chưa có lịch sử test nào</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase border-b border-slate-700">
                <th className="text-left py-2 pr-3">Tên</th>
                <th className="text-left py-2 pr-3">Method / URL</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-center py-2 pr-3">✅</th>
                <th className="text-center py-2 pr-3">❌</th>
                <th className="text-left py-2 pr-3">Thời gian</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 pr-3 font-medium text-white text-sm">{r.name}</td>
                  <td className="py-2.5 pr-3">
                    <span style={{ color: METHOD_COLOR[r.method] }} className="font-bold text-xs">{r.method}</span>
                    <span className="text-slate-400 text-xs ml-2 truncate max-w-[160px] inline-block align-bottom">{r.url}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_CLASS[r.status] || STATUS_CLASS.error}`}>
                      {r.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-center text-emerald-400 font-mono text-sm">{r.passed}</td>
                  <td className="py-2.5 pr-3 text-center text-red-400 font-mono text-sm">{r.failed}</td>
                  <td className="py-2.5 pr-3 text-slate-500 text-xs">{fmtDate(r.started_at)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleViewOutput(r.id)} className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300">Output</button>
                      <button onClick={() => handleRerun(r.id)} className="px-2 py-0.5 text-xs bg-indigo-800 hover:bg-indigo-700 rounded text-indigo-200">Re-run</button>
                      <button onClick={() => handleDelete(r.id)} className="px-2 py-0.5 text-xs bg-red-900/50 hover:bg-red-800 rounded text-red-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOutput !== null && (
        <OutputModal output={modalOutput} onClose={() => setModalOutput(null)} />
      )}
    </div>
  )
}
