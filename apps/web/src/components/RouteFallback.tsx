export function RouteFallback() {
  return (
    <div className="space-y-4">
      <div className="card h-32 shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card h-28 shimmer" />
        <div className="card h-28 shimmer" />
        <div className="card h-28 shimmer" />
      </div>
      <div className="card h-72 shimmer" />
    </div>
  );
}
