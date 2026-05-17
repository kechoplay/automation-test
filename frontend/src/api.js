const api = {
  getFolders: () => fetch('/api/folders').then(r => r.json()),
  createFolder: (name) => fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(r => r.json()),
  renameFolder: (fid, name) => fetch(`/api/folders/${fid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }),
  deleteFolder: (fid) => fetch(`/api/folders/${fid}`, { method: 'DELETE' }),

  generate: (data) => fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getTestCase: (id) => fetch(`/api/test-cases/${id}`).then(r => r.json()),
  deleteTestCase: (id) => fetch(`/api/test-cases/${id}`, { method: 'DELETE' }),

  startRun: (tcId) => fetch(`/api/run/${tcId}`, { method: 'POST' }).then(r => r.json()),

  getHistory: () => fetch('/api/history').then(r => r.json()),
  getRunOutput: (id) => fetch(`/api/history/${id}/output`).then(r => r.json()),
  deleteRun: (id) => fetch(`/api/history/${id}`, { method: 'DELETE' }),
  rerun: (id) => fetch(`/api/history/${id}/rerun`, { method: 'POST' }).then(r => r.json()),
}

export default api
