import PlatformModeNav, { buildPlatformModeHref } from "@/components/PlatformModeNav";

export default function FloatingModeToggle() {
  return (
    <PlatformModeNav
      activeMode="map"
      variant="floating"
      hrefForMode={buildPlatformModeHref}
    />
  );
}
