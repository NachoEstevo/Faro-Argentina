export interface EntryGateAction {
  label: string;
  description: string;
}

export interface EntryGateActions {
  guide: EntryGateAction;
  map: EntryGateAction;
  explorer: EntryGateAction;
}

export function getEntryGateActions(): EntryGateActions {
  return {
    guide: {
      label: "Entender Faro en 90 segundos",
      description: "Un recorrido guiado con datos reales y una ficha verificable.",
    },
    map: {
      label: "Entrar al mapa",
      description: "Paises, cobertura y pistas visibles.",
    },
    explorer: {
      label: "Modo investigador",
      description: "Buscar registros, entidades y recibos.",
    },
  };
}
