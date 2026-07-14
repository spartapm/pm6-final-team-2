import Link from "next/link";

export default function Logo({
  size = "sm",
  href = "/",
}: {
  size?: "sm" | "lg";
  href?: string | null;
}) {
  const box = size === "lg" ? "h-16 w-16" : "h-11 w-11";

  const content = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/service-logo.png"
      alt="allblu"
      className={`${box} object-contain`}
      width={size === "lg" ? 64 : 44}
      height={size === "lg" ? 64 : 44}
      draggable={false}
    />
  );

  if (!href) return content;
  return (
    <Link href={href} className="shrink-0" aria-label="allblu 홈">
      {content}
    </Link>
  );
}
