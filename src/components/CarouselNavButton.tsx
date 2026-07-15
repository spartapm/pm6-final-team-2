"use client";

type Direction = "left" | "right";

export default function CarouselNavButton({
  direction,
  label,
  disabled = false,
  onClick,
  className = "",
}: {
  direction: Direction;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const side = direction === "left" ? "left" : "right";
  const defaultSrc = `/carousel/arrow-${side}-default.svg`;
  const hoverSrc = `/carousel/arrow-${side}-hover.svg`;
  const disabledSrc = `/carousel/arrow-${side}-disabled.svg`;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`group relative hidden h-11 w-11 shrink-0 sm:block ${className}`.trim()}
    >
      {disabled ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={disabledSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={defaultSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-contain opacity-100 transition-opacity group-hover:opacity-0"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hoverSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity group-hover:opacity-100"
            draggable={false}
          />
        </>
      )}
    </button>
  );
}
