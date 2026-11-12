export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <div className="h-8 w-52 animate-pulse rounded-full bg-white/[0.07]" />
      <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded-full bg-white/[0.05]" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[0.06]" />
            <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
