export default function ProductsLoading() {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-950 min-h-screen animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-52 mb-2" />
          <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-28" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-32" />
          <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-lg w-36" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-2" />
            <div className="h-7 bg-gray-200 dark:bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700 mb-4">
        <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded-lg w-full" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="h-32 bg-gray-100 dark:bg-slate-800 rounded-lg mb-3" />
            <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-1/2 mb-3" />
            <div className="flex justify-between">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-20" />
              <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
