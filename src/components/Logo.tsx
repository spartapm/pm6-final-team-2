import Link from "next/link";

export default function Logo({
  size = "sm",
  href = "/",
}: {
  size?: "sm" | "lg";
  href?: string | null;
}) {
  const mark = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : "text-[15px]";

  const content = (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className={`relative ${mark}`}>
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
          <path
            d="M18 50V18.5c0-2.4 1.9-4.3 4.3-4.3h8.2c9.8 0 16.5 5.8 16.5 14.6 0 6.2-3.2 10.7-8.4 13.1L48 50h-8.6l-8.2-7.8H26.3V50H18zm8.3-15.2h5.4c4.7 0 7.7-2.6 7.7-6.6s-3-6.5-7.7-6.5h-5.4v13.1z"
            fill="#1f5eff"
          />
          <path d="M46 12h6v6h-6v-6zm0 10h6v6h-6v-6z" fill="#1f5eff" />
        </svg>
      </span>
      <span className={`${text} font-black tracking-tight text-brand`}>allblu</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="shrink-0" aria-label="allblu 홈">
      {content}
    </Link>
  );
}
