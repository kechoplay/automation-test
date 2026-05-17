import { useState, useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import 'highlight.js/styles/atom-one-dark.css'
import KVEditor from '../components/KVEditor'
import api from '../api'

hljs.registerLanguage('python', python)

const METHOD_COLORS = {
  GET: '#34d399', POST: '#fbbf24', PUT: '#60a5fa', PATCH: '#a78bfa', DELETE: '#f87171',
}

const kvToObj = (rows) => {
  const o = {}
  rows.forEach(({ k, v }) => { if (k) o[k] = v })
  return o
}

const getLineType = (line) => {
  if (/PASSED/.test(line)) return 'passed'
  if (/FAILED|ERROR/.test(line)) return 'failed'
  if (/=====|-----/.test(line)) return 'info'
  return 'default'
}

const LINE_COLOR = { passed: '#34d399', failed: '#f87171', info: '#94a3b8', default: '#e2e8f0' }

export default function NewTest({ currentTestCaseId, setCurrentTestCaseId, refreshKey, onSidebarRefresh, showToast, pendingRunId, setPendingRunId }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [folderId, setFolderId] = useState('')
  const [folders, setFolders] = useState([])
  const [activeTab, setActiveTab] = useState('params')
  const [kvParams, setKvParams] = useState([{ k: '', v: '' }])
  const [kvHeaders, setKvHeaders] = useState([{ k: '', v: '' }])
  const [body, setBody] = useState('')
  const [bodyError, setBodyError] = useState(false)
  const [code, setCode] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [running, setRunning] = useState(false)
  const [consoleLines, setConsoleLines] = useState([])
  const [results, setResults] = useState(null)

  const codeRef = useRef(null)
  const consoleRef = useRef(null)

  useEffect(() => {
    api.getFolders().then(d => setFolders(d.folders || []))
  }, [refreshKey])

  useEffect(() => {
    if (!currentTestCaseId) return
    api.getTestCase(currentTestCaseId).then(tc => {
      setName(tc.name)
      setUrl(tc.url)
      setMethod(tc.method)
      setFolderId(tc.folder_id || '')
      setKvParams(Object.entries(tc.params || {}).map(([k, v]) => ({ k, v })))
      setKvHeaders(Object.entries(tc.headers || {}).map(([k, v]) => ({ k, v })))
      setBody(tc.body ? JSON.stringify(tc.body, null, 2) : '')
      setCode(tc.generated_code || null)
      setConsoleLines([])
      setResults(null)
    })
  }, [currentTestCaseId])

  useEffect(() => {
    if (codeRef.current && code) {
      codeRef.current.textContent = code
      hljs.highlightElement(codeRef.current)
    }
  }, [code])

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleLines])

  useEffect(() => {
    if (!pendingRunId) return
    streamRun(pendingRunId)
    setPendingRunId(null)
  }, [pendingRunId])

  const streamRun = (run_id) => {
    setRunning(true)
    setConsoleLines([{ text: 'Đang khởi động pytest…', type: 'info' }])
    setResults(null)

    const es = new EventSource(`/api/stream/${run_id}`)
    es.onmessage = e => {
      const line = JSON.parse(e.data)
      setConsoleLines(prev => [...prev, { text: line, type: getLineType(line) }])
    }
    es.addEventListener('done', e => {
      es.close()
      setResults(JSON.parse(e.data))
      setRunning(false)
    })
    es.onerror = () => { es.close(); setRunning(false) }
  }

  const handleGenerate = async () => {
    if (!url.trim()) { showToast('Vui lòng nhập URL'); return }

    let bodyVal = null
    if (body.trim()) {
      try { bodyVal = JSON.parse(body) }
      catch { setBodyError(true); return }
    }
    setBodyError(false)
    setGenerating(true)

    try {
      const res = await api.generate({
        name: name.trim() || 'Unnamed',
        url: url.trim(),
        method,
        folder_id: folderId || null,
        headers: kvToObj(kvHeaders),
        params: kvToObj(kvParams),
        body: bodyVal,
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.detail || 'Lỗi generate'); return }

      setCurrentTestCaseId(data.test_case_id)
      setCode(data.code)
      setConsoleLines([])
      setResults(null)
      onSidebarRefresh()
    } finally {
      setGenerating(false)
    }
  }

  const handleRun = async () => {
    if (!currentTestCaseId) return
    const { run_id } = await api.startRun(currentTestCaseId)
    streamRun(run_id)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* URL Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-900 shrink-0">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tên test case"
          className="w-36 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={folderId}
          onChange={e => setFolderId(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">📂 No folder</option>
          {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
        </select>
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          style={{ color: METHOD_COLORS[method] }}
          className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-indigo-500"
        >
          {Object.keys(METHOD_COLORS).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 min-w-[140px] justify-center"
        >
          {generating ? '⏳ Generating…' : '⚡ Generate'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-2 border-b border-slate-700/60 bg-slate-900 shrink-0">
        {['params', 'headers', 'body'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-sm font-medium mr-1 capitalize ${
              activeTab === t
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Tab panes */}
      <div className="bg-slate-900 px-4 py-3 shrink-0" style={{ minHeight: 130 }}>
        {activeTab === 'params' && <KVEditor rows={kvParams} onChange={setKvParams} addLabel="+ Add param" />}
        {activeTab === 'headers' && <KVEditor rows={kvHeaders} onChange={setKvHeaders} addLabel="+ Add header" />}
        {activeTab === 'body' && (
          <div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder='{"key": "value"}'
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            {bodyError && <p className="text-xs text-red-400 mt-1">JSON không hợp lệ</p>}
          </div>
        )}
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden divide-x divide-slate-700/60">
        {/* Left: Generated Code */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-700/60 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generated Code</span>
            {code && (
              <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-700">Copy</button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {!code ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-3xl mb-2">🧪</div>
                <p className="text-sm">Nhập API và bấm <strong className="text-slate-500">Generate</strong></p>
              </div>
            ) : (
              <pre style={{ margin: 0 }}><code ref={codeRef} className="language-python" style={{ borderRadius: 8, fontSize: 12 }} /></pre>
            )}
          </div>
        </div>

        {/* Right: Runner */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-700/60 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Runner</span>
            <button
              onClick={handleRun}
              disabled={!currentTestCaseId || running}
              className="px-4 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg"
            >▶ Run Tests</button>
          </div>

          <div ref={consoleRef} className="flex-1 overflow-auto p-3" style={{ background: '#020617' }}>
            {consoleLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-700">
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-sm">Bấm <strong className="text-slate-600">Run Tests</strong> để bắt đầu</p>
              </div>
            ) : (
              <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {consoleLines.map((line, i) => (
                  <div key={i} style={{ color: LINE_COLOR[line.type] }}>{line.text}</div>
                ))}
              </div>
            )}
          </div>

          {results && (
            <div className="flex items-center gap-4 px-3 py-2.5 bg-slate-800/80 border-t border-slate-700/60 shrink-0">
              <span className="text-sm text-slate-300">✅ <strong className="text-emerald-400">{results.passed}</strong></span>
              <span className="text-sm text-slate-300">❌ <strong className="text-red-400">{results.failed}</strong></span>
              <span className="text-sm text-slate-300">Total: <strong className="text-slate-200">{results.total}</strong></span>
              <div className={`ml-auto px-3 py-0.5 rounded-full text-xs font-bold ${results.status === 'passed' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                {results.status === 'passed' ? '✓ ALL PASSED' : '✗ FAILED'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
