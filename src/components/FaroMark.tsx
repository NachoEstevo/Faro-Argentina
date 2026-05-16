interface Props {
  compact?: boolean;
  className?: string;
}

export default function FaroMark({ compact = false, className = "" }: Props) {
  return (
    <div className={`faroMark ${className}`}>
      <div className="faroMarkIcon" aria-hidden>
        <img src="/brand/faro-mark.svg" alt="" width="44" height="44" decoding="async" />
      </div>
      {!compact && (
        <div>
          <p>FARO</p>
          <span>No acusa. Ilumina.</span>
        </div>
      )}
    </div>
  );
}
