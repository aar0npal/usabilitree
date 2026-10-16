import { getCurrentUser } from "@/lib/auth/session";
import { Paths } from "@/lib/constants";
import { notFound, redirect } from "next/navigation";
import SetupTabs from "./_components/setup-tabs";
import { db } from "@/db";
import { studies } from "@/db/schema";
import { eq } from "drizzle-orm";

interface SetupPageProps {
  params: {
    id: string;
  };
}

export default async function SetupPage({ params }: SetupPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(Paths.Login);
  }

  const [study] = await db.select().from(studies).where(eq(studies.id, params.id));

  if (!study || study.userId !== user.id) {
    notFound();
  }

  return <SetupTabs params={params} />;
}
