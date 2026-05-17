import Link from "next/link";

interface Props {
  compact?: boolean;
  className?: string;
  href?: string | null;
}

export default function FaroMark({ compact = false, className = "", href = "/" }: Props) {
  const content = (
    <>
      <div className="faroMarkIcon" aria-hidden>
        <img src="/brand/faro-mark.png" alt="" width="44" height="44" decoding="async" />
      </div>
      {!compact && (
        <div>
          <p>FARO</p>
          <span>No acusa. Ilumina.</span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link className={`faroMark ${className}`} href={href} aria-label="Volver a la home de Faro">
        {content}
      </Link>
    );
  }

  return <div className={`faroMark ${className}`}>{content}</div>;
}
