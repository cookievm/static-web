// The static. lightning bolt, same shape as on the cards.
export default function Bolt({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="95 76 43 57" aria-hidden="true">
      <path d="M114 76 L95 113 L109 110 L101 133 L138 96 L120 99 L131 76 Z" fill="currentColor" />
    </svg>
  );
}
