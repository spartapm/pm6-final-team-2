export default function Spinner({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blueSoft border-t-navy" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
