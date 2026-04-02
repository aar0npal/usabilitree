import { Suspense } from "react";
import { redirect } from "next/navigation";
import { type Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Paths } from "@/lib/constants";
import { db } from "@/db";
import { studies as studiesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { BillingClient } from "./_components/billing-client";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your study limit and billing",
};

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect(Paths.Login);

  const ownedStudies = await db.select().from(studiesTable).where(eq(studiesTable.userId, user.id));

  const studyLimit = user.studyLimit;
  const studyCount = ownedStudies.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your study limit</p>
      </div>
      <Suspense fallback={null}>
        <BillingClient
          studyLimit={studyLimit}
          studyCount={studyCount}
          userId={user.id}
          creemCustomerId={user.creemCustomerId ?? null}
          productId={env.NEXT_PUBLIC_CREEM_PRODUCT_ID}
        />
      </Suspense>
    </div>
  );
}
