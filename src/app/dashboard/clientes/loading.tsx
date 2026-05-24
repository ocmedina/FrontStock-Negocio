export default function ClientesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen animate-pulse">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-56 mb-2" />
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-40" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-lg w-36" />
          <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-lg w-32" />
          <div className="h-11 bg-gray-200 dark:bg-slate-700 rounded-lg w-36" />
        </div>
      </div>

      {/* Search & filter */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg mb-6 p-4 border border-gray-200 dark:border-slate-700">
        <div className="flex gap-3">
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg flex-1" />
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-44" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
              <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-36 flex-1" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-28" />
              <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-40" />
              <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-full w-20" />
              <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded w-20" />
              <div className="h-8 bg-gray-100 dark:bg-slate-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
