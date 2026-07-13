/** 섹션 제목 + allblu_icons (이모지 대신) */
export const sectionIcons = {
  waveOngoing: "/section-icons/icon1_wave_ongoing.svg",
  fishSchool: "/section-icons/icon2_fish_school.svg",
  bigWave: "/section-icons/icon3_big_wave.svg",
  anchor: "/section-icons/icon4_anchor.svg",
  sunrise: "/section-icons/icon5_sunrise.svg",
  dropletNew: "/section-icons/icon6_droplet_new.svg",
  starfishRating: "/section-icons/icon7_starfish_rating.svg",
  pearlPick: "/section-icons/icon8_pearl_pick.svg",
  spyglassSeen: "/section-icons/icon9_spyglass_seen.svg",
} as const;

export default function SectionHeading({
  title,
  icon,
  className = "",
}: {
  title: string;
  icon?: string;
  className?: string;
}) {
  return (
    <h2
      className={`flex items-center gap-2 text-lg font-black tracking-tight ${className}`.trim()}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="h-7 w-7 shrink-0" width={28} height={28} draggable={false} />
      ) : null}
      <span>{title}</span>
    </h2>
  );
}
