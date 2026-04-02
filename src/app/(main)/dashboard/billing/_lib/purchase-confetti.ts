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
  totalCount: 240,
  origin: { x: 0.5, y: 0.62 },
  colors: ["#72FFA4", "#00D9C2", "#ffffff", "#72FFA4", "#00D9C2"],
  layers: [
    { ratio: 0.25, spread: 26, startVelocity: 55, decay: 0.9, scalar: 1 },
    { ratio: 0.2, spread: 60, startVelocity: 45, decay: 0.9, scalar: 1 },
    { ratio: 0.35, spread: 100, startVelocity: 45, decay: 0.91, scalar: 0.8 },
    { ratio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 },
    { ratio: 0.1, spread: 120, startVelocity: 45, decay: 0.9, scalar: 1 },
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
