"use client";

import * as React from "react";
import { LevaPanel, useControls, useCreateStore, folder, button } from "leva";
import {
  DEFAULT_PURCHASE_CONFETTI_PARAMS,
  firePurchaseConfetti,
  setPurchaseConfettiParams,
  type PurchaseConfettiParams,
} from "../_lib/purchase-confetti";

const L = DEFAULT_PURCHASE_CONFETTI_PARAMS.layers;

/** Leva merges folder leaves by leaf key — use unique ids, labels for UI. */
type BillingLevaValues = {
  g_totalCount: number;
  g_originX: number;
  g_originY: number;
  g_colorA: string;
  g_colorB: string;
  g_colorC: string;
  l1_ratio: number;
  l1_spread: number;
  l1_startVelocity: number;
  l1_decay: number;
  l1_scalar: number;
  l2_ratio: number;
  l2_spread: number;
  l2_startVelocity: number;
  l2_decay: number;
  l2_scalar: number;
  l3_ratio: number;
  l3_spread: number;
  l3_startVelocity: number;
  l3_decay: number;
  l3_scalar: number;
  l4_ratio: number;
  l4_spread: number;
  l4_startVelocity: number;
  l4_decay: number;
  l4_scalar: number;
  l5_ratio: number;
  l5_spread: number;
  l5_startVelocity: number;
  l5_decay: number;
  l5_scalar: number;
};

function valuesToParams(v: BillingLevaValues): PurchaseConfettiParams {
  return {
    totalCount: v.g_totalCount,
    origin: { x: v.g_originX, y: v.g_originY },
    colors: [v.g_colorA, v.g_colorB, v.g_colorC, v.g_colorA, v.g_colorB],
    layers: [
      {
        ratio: v.l1_ratio,
        spread: v.l1_spread,
        startVelocity: v.l1_startVelocity,
        decay: v.l1_decay,
        scalar: v.l1_scalar,
      },
      {
        ratio: v.l2_ratio,
        spread: v.l2_spread,
        startVelocity: v.l2_startVelocity,
        decay: v.l2_decay,
        scalar: v.l2_scalar,
      },
      {
        ratio: v.l3_ratio,
        spread: v.l3_spread,
        startVelocity: v.l3_startVelocity,
        decay: v.l3_decay,
        scalar: v.l3_scalar,
      },
      {
        ratio: v.l4_ratio,
        spread: v.l4_spread,
        startVelocity: v.l4_startVelocity,
        decay: v.l4_decay,
        scalar: v.l4_scalar,
      },
      {
        ratio: v.l5_ratio,
        spread: v.l5_spread,
        startVelocity: v.l5_startVelocity,
        decay: v.l5_decay,
        scalar: v.l5_scalar,
      },
    ],
  };
}

function isBillingLevaValues(v: unknown): v is BillingLevaValues {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.g_totalCount === "number" && typeof o.l1_ratio === "number";
}

export default function BillingConfettiDev() {
  const [levaOpen, setLevaOpen] = React.useState(false);
  const store = useCreateStore();

  const [values] = useControls(
    () => ({
      general: folder({
        g_totalCount: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.totalCount,
          min: 50,
          max: 600,
          step: 10,
          label: "Total particles",
        },
        g_originX: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.origin.x,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Origin X",
        },
        g_originY: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.origin.y,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Origin Y",
        },
        g_colorA: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.colors[0] ?? "#72FFA4",
          label: "Color A",
        },
        g_colorB: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.colors[1] ?? "#00D9C2",
          label: "Color B",
        },
        g_colorC: {
          value: DEFAULT_PURCHASE_CONFETTI_PARAMS.colors[2] ?? "#ffffff",
          label: "Color C",
        },
      }),
      layer1: folder(
        {
          l1_ratio: { value: L[0]!.ratio, min: 0.05, max: 1, step: 0.01, label: "Share of total" },
          l1_spread: { value: L[0]!.spread, min: 0, max: 180, step: 1, label: "Spread" },
          l1_startVelocity: {
            value: L[0]!.startVelocity,
            min: 5,
            max: 120,
            step: 1,
            label: "Start velocity",
          },
          l1_decay: { value: L[0]!.decay, min: 0.8, max: 0.99, step: 0.01, label: "Decay" },
          l1_scalar: { value: L[0]!.scalar, min: 0.3, max: 2.5, step: 0.05, label: "Scalar" },
        },
        { collapsed: true }
      ),
      layer2: folder(
        {
          l2_ratio: { value: L[1]!.ratio, min: 0.05, max: 1, step: 0.01, label: "Share of total" },
          l2_spread: { value: L[1]!.spread, min: 0, max: 180, step: 1, label: "Spread" },
          l2_startVelocity: {
            value: L[1]!.startVelocity,
            min: 5,
            max: 120,
            step: 1,
            label: "Start velocity",
          },
          l2_decay: { value: L[1]!.decay, min: 0.8, max: 0.99, step: 0.01, label: "Decay" },
          l2_scalar: { value: L[1]!.scalar, min: 0.3, max: 2.5, step: 0.05, label: "Scalar" },
        },
        { collapsed: true }
      ),
      layer3: folder(
        {
          l3_ratio: { value: L[2]!.ratio, min: 0.05, max: 1, step: 0.01, label: "Share of total" },
          l3_spread: { value: L[2]!.spread, min: 0, max: 180, step: 1, label: "Spread" },
          l3_startVelocity: {
            value: L[2]!.startVelocity,
            min: 5,
            max: 120,
            step: 1,
            label: "Start velocity",
          },
          l3_decay: { value: L[2]!.decay, min: 0.8, max: 0.99, step: 0.01, label: "Decay" },
          l3_scalar: { value: L[2]!.scalar, min: 0.3, max: 2.5, step: 0.05, label: "Scalar" },
        },
        { collapsed: true }
      ),
      layer4: folder(
        {
          l4_ratio: { value: L[3]!.ratio, min: 0.05, max: 1, step: 0.01, label: "Share of total" },
          l4_spread: { value: L[3]!.spread, min: 0, max: 180, step: 1, label: "Spread" },
          l4_startVelocity: {
            value: L[3]!.startVelocity,
            min: 5,
            max: 120,
            step: 1,
            label: "Start velocity",
          },
          l4_decay: { value: L[3]!.decay, min: 0.8, max: 0.99, step: 0.01, label: "Decay" },
          l4_scalar: { value: L[3]!.scalar, min: 0.3, max: 2.5, step: 0.05, label: "Scalar" },
        },
        { collapsed: true }
      ),
      layer5: folder(
        {
          l5_ratio: { value: L[4]!.ratio, min: 0.05, max: 1, step: 0.01, label: "Share of total" },
          l5_spread: { value: L[4]!.spread, min: 0, max: 180, step: 1, label: "Spread" },
          l5_startVelocity: {
            value: L[4]!.startVelocity,
            min: 5,
            max: 120,
            step: 1,
            label: "Start velocity",
          },
          l5_decay: { value: L[4]!.decay, min: 0.8, max: 0.99, step: 0.01, label: "Decay" },
          l5_scalar: { value: L[4]!.scalar, min: 0.3, max: 2.5, step: 0.05, label: "Scalar" },
        },
        { collapsed: true }
      ),
      actions: folder({
        "Test burst": button(() => {
          firePurchaseConfetti();
        }),
      }),
    }),
    { store }
  );

  React.useEffect(() => {
    if (!isBillingLevaValues(values)) return;
    setPurchaseConfettiParams(valuesToParams(values));
  }, [values]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      setLevaOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <LevaPanel store={store} hidden={!levaOpen} titleBar={{ title: "Billing confetti (C)" }} />
  );
}
