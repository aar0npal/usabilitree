"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreemCheckout, CreemPortal } from "@creem_io/nextjs";
import { ExternalLinkIcon, BookOpen, History, Sparkles, CheckCircle2 } from "lucide-react";
import { STUDIES_PER_PURCHASE } from "@/lib/billing/study-limit";
import { getBillingUsageMetrics } from "@/lib/billing/billing-usage";
import { CREEM_API } from "@/lib/constants";
import { motion, animate, AnimatePresence } from "framer-motion";
import { containerVariants, cardVariants } from "@/lib/animations";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { firePurchaseConfetti } from "../_lib/purchase-confetti";

const BillingConfettiDev =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./billing-confetti-dev"), { ssr: false })
    : () => null;

interface BillingClientProps {
  studyLimit: number;
  studyCount: number;
  userId: string;
  creemCustomerId: string | null;
  productId?: string;
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [value]);

  return <span className={className}>{display}</span>;
}

type ConfettiPiece = {
  color: string;
  x: number;
  delay: number;
  size: number;
  endY: number;
  rotate: number;
  driftX: number;
  duration: number;
};

function ConfettiBurst() {
  const pieces = React.useMemo((): ConfettiPiece[] => {
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
    return Array.from({ length: 20 }, (_, i) => {
      const color = colors[i % colors.length];
      return {
        color,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        size: 6 + Math.random() * 6,
        endY: 120 + Math.random() * 80,
        rotate: Math.random() > 0.5 ? 360 : -360,
        driftX: (Math.random() - 0.5) * 60,
        duration: 1 + Math.random() * 0.5,
      };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: "-8px",
            width: p.size,
            height: p.size,
            background: p.color,
          }}
          initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: p.endY,
            opacity: [1, 1, 0],
            rotate: p.rotate,
            scale: [1, 0.8],
            x: p.driftX,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0, 0.8, 1] }}
        />
      ))}
    </div>
  );
}

export function BillingClient({
  studyLimit,
  studyCount,
  userId,
  creemCustomerId,
  productId,
}: BillingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnedFromCheckout = Boolean(searchParams.get("checkout_id"));
  const [justPurchased, setJustPurchased] = React.useState(false);

  // Snapshot limit before Creem opens — survives the cross-origin redirect back.
  const handleCheckoutInitiated = () => {
    sessionStorage.setItem("pre_checkout_study_limit", String(studyLimit));
  };

  React.useEffect(() => {
    if (!returnedFromCheckout) return;

    const raw =
      typeof window !== "undefined" ? sessionStorage.getItem("pre_checkout_study_limit") : null;
    const baseline = raw !== null && raw !== "" ? Number.parseInt(raw, 10) : null;
    const baselineOk = baseline !== null && Number.isFinite(baseline);

    if (baselineOk && studyLimit > baseline) {
      setJustPurchased(true);
      sessionStorage.removeItem("pre_checkout_study_limit");
      firePurchaseConfetti();
      toast.success(`+${STUDIES_PER_PURCHASE} studies added to your account!`, {
        description: "Your Starter Study Pack is ready to use. Go create something.",
        duration: 6000,
      });
      const t = setTimeout(() => {
        router.replace("/dashboard/billing");
        setJustPurchased(false);
      }, 1800);
      return () => clearTimeout(t);
    }

    let attempts = 0;
    const maxAttempts = 15;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= maxAttempts) {
        clearInterval(id);
        if (typeof window !== "undefined") {
          toast.info("Your purchase is still processing", {
            description:
              "We have not seen your study limit update yet. It usually appears within a minute. Refresh this page or check back shortly.",
            duration: 8000,
          });
          router.replace("/dashboard/billing");
        }
      }
    }, 1200);

    return () => clearInterval(id);
  }, [returnedFromCheckout, router, studyLimit]);

  const { usagePercent, isAtLimit, remaining } = getBillingUsageMetrics(studyCount, studyLimit);

  const barColorClass =
    usagePercent >= 90 ? "bg-destructive" : usagePercent >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <motion.div
      className="max-w-2xl space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {process.env.NODE_ENV === "development" ? <BillingConfettiDev /> : null}
      {/* Study Usage */}
      <motion.div variants={cardVariants}>
        <Card className="relative overflow-hidden">
          <AnimatePresence>{justPurchased && <ConfettiBurst />}</AnimatePresence>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Study Usage
                </CardTitle>
                <AnimatePresence mode="wait">
                  {justPurchased ? (
                    <motion.p
                      key="success"
                      className="mt-1 flex items-center gap-1.5 text-sm font-medium text-green-600"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Purchase confirmed!
                    </motion.p>
                  ) : (
                    <motion.p
                      key="remaining"
                      className="mt-1 text-sm text-muted-foreground"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {remaining > 0
                        ? `${remaining} ${remaining === 1 ? "study" : "studies"} remaining`
                        : "You've used all your available studies"}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-3xl font-bold tabular-nums leading-none">
                  <AnimatedNumber value={studyCount} />
                  <span className="text-xl font-medium text-muted-foreground">
                    {" "}
                    / <AnimatedNumber value={studyLimit} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{usagePercent}% used</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className={`h-full rounded-full ${barColorClass}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                />
                {/* Shimmer effect after fill */}
                <motion.div
                  className="absolute inset-y-0 left-0 w-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                  }}
                  initial={{ backgroundPosition: "-200% 0", opacity: 0 }}
                  animate={{ backgroundPosition: "200% 0", opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, delay: 1.4, ease: "easeInOut" }}
                />
                {returnedFromCheckout && !justPurchased && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/15"
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>

              <AnimatePresence>
                {isAtLimit && !justPurchased && (
                  <motion.p
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    You&apos;ve reached your study limit. Purchase more to continue creating
                    studies.
                  </motion.p>
                )}
                {returnedFromCheckout && !justPurchased && (
                  <motion.p
                    key="polling"
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Confirming your purchase&hellip;
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add More Studies */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Add More Studies
                </CardTitle>
                <CardDescription className="mt-1">
                  Starter Study Pack &middot; {STUDIES_PER_PURCHASE} studies &middot; $1 each
                  &middot; one-time
                </CardDescription>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold leading-none">$5</p>
                <p className="mt-0.5 text-xs text-muted-foreground">no subscription</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {productId ? (
              <CreemCheckout
                checkoutPath={CREEM_API.checkout}
                productId={productId}
                referenceId={userId}
                successUrl="/dashboard/billing"
              >
                <Button
                  className="h-11 w-full text-[15px] font-medium"
                  onClick={handleCheckoutInitiated}
                >
                  Get Starter Study Pack &mdash; $5
                </Button>
              </CreemCheckout>
            ) : (
              <Button className="h-11 w-full" disabled title="Set NEXT_PUBLIC_CREEM_PRODUCT_ID">
                Checkout unavailable
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Purchase History */}
      {creemCustomerId && (
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Purchase History
              </CardTitle>
              <CardDescription>View your past transactions and receipts.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <CreemPortal customerId={creemCustomerId} portalPath={CREEM_API.portal}>
                <Button variant="outline" className="gap-2">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Open Billing Portal
                </Button>
              </CreemPortal>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
