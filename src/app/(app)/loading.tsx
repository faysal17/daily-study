export default function Loading() {
  return (
    <main className="page">
      <div className="flex items-center justify-between py-3">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton h-7 w-16" />
      </div>
      <div className="mb-5 flex gap-1 pb-2">
        {[64, 64, 56, 72].map((w, i) => (
          <div key={i} className="skeleton h-8" style={{ width: w }} />
        ))}
      </div>
      <div className="skeleton mb-2 h-8 w-40" />
      <div className="skeleton mb-6 h-4 w-56" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    </main>
  );
}
