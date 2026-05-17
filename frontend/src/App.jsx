import { useState, useCallback } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import NewTest from './pages/NewTest'
import History from './pages/History'

export default function App() {
  const [page, setPage] = useState('new')
  const [toast, setToast] = useState(null)
  const [currentTestCaseId, setCurrentTestCaseId] = useState(null)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const [pendingRunId, setPendingRunId] = useState(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const refreshSidebar = useCallback(() => {
    setSidebarRefreshKey(k => k + 1)
  }, [])

  const handleSelectTestCase = useCallback((id) => {
    setCurrentTestCaseId(id)
    setPage('new')
  }, [])

  const handleRerun = useCallback((run_id) => {
    setPendingRunId(run_id)
    setPage('new')
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0f1117', color: '#e2e8f0' }}>
      <Header page={page} setPage={setPage} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          refreshKey={sidebarRefreshKey}
          currentTestCaseId={currentTestCaseId}
          onSelectTestCase={handleSelectTestCase}
          onRefresh={refreshSidebar}
          onDeleteTestCase={() => setCurrentTestCaseId(null)}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          {page === 'new' ? (
            <NewTest
              currentTestCaseId={currentTestCaseId}
              setCurrentTestCaseId={setCurrentTestCaseId}
              refreshKey={sidebarRefreshKey}
              onSidebarRefresh={refreshSidebar}
              showToast={showToast}
              pendingRunId={pendingRunId}
              setPendingRunId={setPendingRunId}
            />
          ) : (
            <History showToast={showToast} onRerun={handleRerun} />
          )}
        </div>
      </div>
      {toast && <Toast message={toast} />}
    </div>
  )
}
