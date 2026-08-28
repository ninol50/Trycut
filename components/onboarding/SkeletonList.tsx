/** Skeleton de la transition n°2 : 2 secondes, puis avancement automatique. */
export default function SkeletonList() {
  return (
    <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="aspect-square animate-pulse rounded-2xl bg-violet-50"
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}
