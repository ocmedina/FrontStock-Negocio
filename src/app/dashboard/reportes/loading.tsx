export default function ReportesLoading() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-52 mb-2" />
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-36" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-36" />
      </div>

      {/* Date selector */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700 mb-6">
        <div className="flex gap-4 items-center">
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-44" />
          <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-32" />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-lg">
        <div className="h-72 bg-gray-100/50 dark:bg-slate-700/50 rounded-xl" />
      </div>
    </div>
  );
}
