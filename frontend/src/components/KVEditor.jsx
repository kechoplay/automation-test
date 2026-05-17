export default function KVEditor({ rows, onChange, addLabel = '+ Add row' }) {
  const addRow = () => onChange([...rows, { k: '', v: '' }])
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i))
  const updateRow = (i, field, value) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [field]: value }
    onChange(updated)
  }

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={row.k}
              placeholder="Key"
              onChange={e => updateRow(i, 'k', e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 px-2 py-1 rounded text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              value={row.v}
              placeholder="Value"
              onChange={e => updateRow(i, 'v', e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 text-slate-200 px-2 py-1 rounded text-sm focus:outline-none focus:border-indigo-500"
            />
            <button onClick={() => removeRow(i)} className="text-slate-500 hover:text-red-400 text-lg px-1">×</button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300">{addLabel}</button>
    </div>
  )
}
