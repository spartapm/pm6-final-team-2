export default function Spinner({
  label = "불러오는 중",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        compact ? "py-2" : "min-h-[60svh] bg-white"
      }`}
    >
      <div
        className={`animate-spin rounded-full border-4 border-blueSoft border-t-brand ${
          compact ? "h-7 w-7" : "h-10 w-10"
        }`}
      />
      {compact ? null : <p className="text-sm text-muted">{label}</p>}
    </div>
  );
}
