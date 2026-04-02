import confetti from "canvas-confetti";

export type PurchaseConfettiLayer = {
  ratio: number;
  spread: number;
  startVelocity: number;
  decay: number;
  scalar: number;
};

export type PurchaseConfettiParams = {
  totalCount: number;
  origin: { x: number; y: number };
  colors: string[];
  layers: PurchaseConfettiLayer[];
};

export const DEFAULT_PURCHASE_CONFETTI_PARAMS: PurchaseConfettiParams = {
  totalCount: 300,
  origin: { x: 0.5, y: 1 },
  colors: ["#5fef92", "#00d9c2", "#ef36c0", "#5fef92", "#00d9c2"],
  layers: [
    { ratio: 0.3, spread: 65, startVelocity: 55, decay: 0.9, scalar: 1.2 },
    { ratio: 0.2, spread: 60, startVelocity: 45, decay: 0.9, scalar: 1 },
    { ratio: 0.35, spread: 88, startVelocity: 56, decay: 0.93, scalar: 0.75 },
    { ratio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
    { ratio: 0.11, spread: 120, startVelocity: 45, decay: 0.91, scalar: 1 },
  ],
};

/** Updated by the billing dev Leva panel in development; production keeps defaults. */
let activeParams: PurchaseConfettiParams = DEFAULT_PURCHASE_CONFETTI_PARAMS;

export function setPurchaseConfettiParams(next: PurchaseConfettiParams) {
  activeParams = next;
}

export function getPurchaseConfettiParams(): PurchaseConfettiParams {
  return activeParams;
}

/**
 * Clipboard / chat payload: full `DEFAULT_PURCHASE_CONFETTI_PARAMS` export line plus raw JSON
 * so you can paste into the assistant or replace the constant in this file.
 */
export function formatConfettiParamsForPaste(params: PurchaseConfettiParams): string {
  const json = JSON.stringify(params, null, 2);
  return [
    "Confetti config — paste into chat to update DEFAULT_PURCHASE_CONFETTI_PARAMS, or replace the constant in:",
    "src/app/(main)/dashboard/billing/_lib/purchase-confetti.ts",
    "",
    "export const DEFAULT_PURCHASE_CONFETTI_PARAMS: PurchaseConfettiParams =",
    `${json};`,
    "",
    "--- raw JSON ---",
    json,
  ].join("\n");
}

export function firePurchaseConfetti() {
  const { totalCount, origin, colors, layers } = activeParams;
  for (const layer of layers) {
    confetti({
      particleCount: Math.max(1, Math.floor(totalCount * layer.ratio)),
      origin,
      colors,
      spread: layer.spread,
      startVelocity: layer.startVelocity,
      decay: layer.decay,
      scalar: layer.scalar,
    });
  }
}
