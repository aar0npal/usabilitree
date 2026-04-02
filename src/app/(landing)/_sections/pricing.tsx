import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Paths } from "@/lib/constants";
import { STUDIES_PER_PURCHASE, DEFAULT_STUDY_LIMIT } from "@/lib/billing/study-limit";
import { getCurrentUser } from "@/lib/auth/session";
import Section from "../_components/section";

const FREE_LIMIT = DEFAULT_STUDY_LIMIT;

const features = [
  "Unlimited participants per study",
  "Full results & analytics",
  "Export to Excel (.xlsx)",
  "Collaboration sharing",
];

export async function PricingSection() {
  const user = await getCurrentUser();
  return (
    <Section id="pricing">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Pay only when you need more studies.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free tier */}
          <div className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Free
              </p>
              <p className="mt-1 text-4xl font-bold">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">forever</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">&#10003;</span>
                {FREE_LIMIT} studies included
              </li>
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-primary">&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link href={Paths.Signup}>
              <Button variant="outline" className="w-full">
                Get started free
              </Button>
            </Link>
          </div>

          {/* Pay-as-you-go */}
          <div className="relative flex flex-col rounded-xl border border-primary/40 bg-card p-6 shadow-sm ring-1 ring-primary/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Need more?
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Starter Study Pack
              </p>
              <p className="mt-1 text-4xl font-bold">$5</p>
              <p className="mt-1 text-sm text-muted-foreground">one-time &bull; per pack</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">&#10003;</span>+{STUDIES_PER_PURCHASE} studies added
                to your limit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">&#10003;</span>
                Stackable &mdash; buy as many packs as you need
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">&#10003;</span>
                No subscription, no recurring charges
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">&#10003;</span>
                Includes everything in Free
              </li>
            </ul>

            <Link href={user ? Paths.Billing : Paths.Login}>
              <Button className="w-full">Get Starter Study Pack &mdash; $5</Button>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Payments securely processed by{" "}
          <a
            href="https://creem.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Creem
          </a>
          . Questions?{" "}
          <a href="mailto:support@usabilitree.com" className="underline underline-offset-2">
            support@usabilitree.com
          </a>
        </p>
      </div>
    </Section>
  );
}
