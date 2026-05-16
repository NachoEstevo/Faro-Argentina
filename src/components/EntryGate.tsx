import { MapPin } from "lucide-react";

import FaroMark from "./FaroMark";

export default function EntryGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="entryGate" role="dialog" aria-modal="true" aria-label="Faro">
      <video autoPlay muted loop playsInline poster="/img/ascii-loader.png">
        <source src="/img/faro-loader.mp4" type="video/mp4" />
      </video>
      <div className="entryScrim" />
      <div className="entryBeam" />
      <div className="entryContent">
        <FaroMark className="entryMark" />
        <h1>No acusa, ilumina.</h1>
        <p>
          Faro convierte datos oficiales de dinero publico en pistas verificables: mapa,
          expediente, fuente y descarga.
        </p>
        <button type="button" onClick={onEnter}>
          <MapPin size={18} aria-hidden />
          Entrar al mapa
        </button>
      </div>
    </div>
  );
}
