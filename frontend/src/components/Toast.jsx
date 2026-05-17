export default function Toast({ message }) {
  return (
    <div className="fixed bottom-5 right-5 bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2.5 rounded-lg text-sm max-w-sm shadow-xl z-50">
      {message}
    </div>
  )
}
