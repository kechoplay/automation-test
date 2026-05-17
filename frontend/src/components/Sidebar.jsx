import { useState, useEffect, useRef } from 'react'
import api from '../api'

const METHOD_COLOR = {
  GET: 'text-emerald-400', POST: 'text-yellow-400',
  PUT: 'text-blue-400', PATCH: 'text-violet-400', DELETE: 'text-red-400',
}

export default function Sidebar({ refreshKey, currentTestCaseId, onSelectTestCase, onRefresh, onDeleteTestCase }) {
  const [data, setData] = useState({ folders: [], uncategorized: [] })
  const [openFolders, setOpenFolders] = useState({})
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef(null)

  const load = () => api.getFolders().then(setData)

  useEffect(() => { load() }, [refreshKey])

  const isOpen = (fid) => openFolders[fid] !== false
  const toggleFolder = (fid) => setOpenFolders(prev => ({ ...prev, [fid]: !isOpen(fid) }))

  const openNewFolderModal = () => {
    setNewFolderName('')
    setShowNewFolder(true)
    setTimeout(() => newFolderInputRef.current?.focus(), 50)
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    setShowNewFolder(false)
    await api.createFolder(newFolderName.trim())
    onRefresh?.()
  }

  const handleRename = async (fid) => {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await api.renameFolder(fid, renameValue.trim())
    setRenamingId(null)
    onRefresh?.()
  }

  const handleDelete = async (fid) => {
    const f = data.folders.find(x => x.id === fid)
    const count = f?.test_cases?.length || 0
    const msg = count > 0
      ? `Xóa folder "${f.name}"? ${count} test case sẽ chuyển sang Uncategorized.`
      : `Xóa folder "${f?.name}"?`
    if (!confirm(msg)) return
    await api.deleteFolder(fid)
    onRefresh?.()
  }

  const handleDeleteTestCase = async (tc) => {
    if (!confirm(`Xóa "${tc.name}"?`)) return
    await api.deleteTestCase(tc.id)
    if (currentTestCaseId === tc.id) onDeleteTestCase?.()
    onRefresh?.()
  }

  const TCItem = ({ tc }) => (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-slate-800 ${currentTestCaseId === tc.id ? 'bg-blue-950' : ''}`}
    >
      <span
        onClick={() => onSelectTestCase(tc.id)}
        className={`${METHOD_COLOR[tc.method] || 'text-slate-400'} text-xs font-bold w-10 shrink-0`}
      >{tc.method}</span>
      <span
        onClick={() => onSelectTestCase(tc.id)}
        className="text-xs text-slate-300 truncate flex-1"
      >{tc.name}</span>
      <button
        onClick={e => { e.stopPropagation(); handleDeleteTestCase(tc) }}
        className="hidden group-hover:block text-slate-500 hover:text-red-400 text-xs px-1 shrink-0"
        title="Xóa"
      >🗑️</button>
    </div>
  )

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-slate-700/60 bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Collections</span>
        <button onClick={openNewFolderModal} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 text-lg leading-none">+</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {data.folders.map(f => (
          <div key={f.id}>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 cursor-pointer group">
              <span
                onClick={() => toggleFolder(f.id)}
                className={`text-slate-500 text-xs transition-transform duration-150 inline-block ${isOpen(f.id) ? 'rotate-90' : ''}`}
              >▶</span>
              <span className="text-sm mr-1" onClick={() => toggleFolder(f.id)}>📁</span>
              {renamingId === f.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(f.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="flex-1 bg-slate-800 border border-indigo-500 text-slate-200 rounded px-1 py-0.5 text-sm outline-none"
                />
              ) : (
                <span className="text-sm text-slate-200 flex-1 truncate" onClick={() => toggleFolder(f.id)}>{f.name}</span>
              )}
              {!f.is_default && (
                <span className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={e => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.name) }} className="text-slate-500 hover:text-indigo-400 text-xs px-1">✏️</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(f.id) }} className="text-slate-500 hover:text-red-400 text-xs px-1">🗑️</button>
                </span>
              )}
            </div>
            {isOpen(f.id) && (
              <div className="pl-5 space-y-0.5">
                {f.test_cases.length === 0
                  ? <p className="text-xs text-slate-600 px-2 py-1">Empty</p>
                  : f.test_cases.map(tc => <TCItem key={tc.id} tc={tc} />)}
              </div>
            )}
          </div>
        ))}

        {data.uncategorized?.length > 0 && (
          <div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 cursor-pointer" onClick={() => toggleFolder('__uncategorized')}>
              <span className={`text-slate-500 text-xs transition-transform duration-150 inline-block ${isOpen('__uncategorized') ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-sm mr-1">📂</span>
              <span className="text-sm text-slate-400 flex-1">Uncategorized</span>
            </div>
            {isOpen('__uncategorized') && (
              <div className="pl-5 space-y-0.5">
                {data.uncategorized.map(tc => <TCItem key={tc.id} tc={tc} />)}
              </div>
            )}
          </div>
        )}

        {data.folders.length === 0 && !data.uncategorized?.length && (
          <p className="text-xs text-slate-600 px-3 py-4 text-center">Chưa có folder nào.<br />Bấm + để tạo mới.</p>
        )}
      </div>

      {showNewFolder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={e => e.target === e.currentTarget && setShowNewFolder(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-80 p-5 flex flex-col gap-4">
            <h3 className="text-white font-semibold">Tạo folder mới</h3>
            <input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleNewFolder()
                if (e.key === 'Escape') setShowNewFolder(false)
              }}
              placeholder="Tên folder..."
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolder(false)}
                className="px-4 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >Hủy</button>
              <button
                onClick={handleNewFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-lg"
              >Tạo</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
