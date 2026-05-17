import test from "node:test";
import assert from "node:assert/strict";

import { getEntryGateActions } from "../src/lib/data/entryGate.ts";

test("getEntryGateActions exposes the three first-visit choices", () => {
  const actions = getEntryGateActions();

  assert.deepEqual(actions, {
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
  });
});

test("getEntryGateActions keeps entry copy non-accusatory", () => {
  assert.doesNotMatch(JSON.stringify(getEntryGateActions()), /corrup|fraude|delito|culpable|abuso|favorit|incumpl|irregular/i);
});
