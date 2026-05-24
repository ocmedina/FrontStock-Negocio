export default function VentasLoading() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-28" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-36" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700 mb-4">
        <div className="flex gap-3">
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg flex-1" />
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-40" />
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-40" />
        </div>
      </div>

      {/* Table rows */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-24" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-36 flex-1" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-24" />
              <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-full w-20" />
              <div className="h-8 bg-gray-100 dark:bg-slate-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
