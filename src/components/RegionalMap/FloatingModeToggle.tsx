import PlatformModeNav, { buildPlatformModeHref } from "@/components/PlatformModeNav";

interface Props {
  showSecondaryAction?: boolean;
}

export default function FloatingModeToggle({ showSecondaryAction = true }: Props) {
  return (
    <PlatformModeNav
      activeMode="map"
      variant="floating"
      hrefForMode={buildPlatformModeHref}
      showSecondaryAction={showSecondaryAction}
    />
  );
}
