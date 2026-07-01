import { ArrowRight, Compass, Map, SearchCode } from "lucide-react";

import { getEntryGateActions } from "@/lib/data/entryGate";
import FaroMark from "./FaroMark";

interface Props {
  onEnterMap: () => void;
  onEnterExplorer: () => void;
  onStartGuide: () => void;
}

export default function EntryGate({ onEnterMap, onEnterExplorer, onStartGuide }: Props) {
  const actions = getEntryGateActions();

  return (
    <div className="entryGate" role="dialog" aria-modal="true" aria-label="Faro">
      <video autoPlay muted loop playsInline poster="/img/ascii-loader.png">
        <source src="/img/faro-loader.mp4" type="video/mp4" />
      </video>
      <div className="entryScrim" />
      <div className="entryBeam" />
      <div className="entryContent">
        <div className="entryBrand">
          <FaroMark className="entryMark" compact={false} />
          <div className="entryRule" />
        </div>
        <h1>No acusa, ilumina.</h1>
        <p>
          Faro convierte compras públicas, proveedores y fuentes oficiales en un
          recorrido simple: ver el mapa, abrir una pista y comprobar la evidencia.
        </p>
        <div className="entryActionStack">
          <button type="button" className="entryAction primary" onClick={onStartGuide}>
            <span>
              <span className="entryActionTitle">
                <Compass size={17} aria-hidden />
                {actions.guide.label}
              </span>
              <span className="entryActionText">{actions.guide.description}</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
        <div className="entryActionGrid">
          <button type="button" className="entryAction primary" onClick={onEnterMap}>
            <span>
              <span className="entryActionTitle">
                <Map size={17} aria-hidden />
                {actions.map.label}
              </span>
              <span className="entryActionText">{actions.map.description}</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
          <button type="button" className="entryAction secondary" onClick={onEnterExplorer}>
            <span>
              <span className="entryActionTitle">
                <SearchCode size={17} aria-hidden />
                {actions.explorer.label}
              </span>
              <span className="entryActionText">{actions.explorer.description}</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
