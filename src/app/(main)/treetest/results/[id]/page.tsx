import { redirect } from "next/navigation";
import { Paths } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db";
import { studies, studyCollaborators } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ResultTabs from "./_components/result-tabs";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    return redirect(Paths.Login);
  }

  const [study] = await db.select().from(studies).where(eq(studies.id, params.id));

  if (!study) {
    notFound();
  }

  // Check if user is either the owner or a collaborator
  const isOwner = study.userId === user.id;
  const [collaborator] = await db
    .select()
    .from(studyCollaborators)
    .where(
      and(eq(studyCollaborators.studyId, params.id), eq(studyCollaborators.email, user.email))
    );

  const hasAccess = isOwner || !!collaborator; //|| user.id === "UI9uuzgSHHs0Xa46KZCHB";

  if (!hasAccess) {
    notFound();
  }

  return <ResultTabs params={params} userEmail={user.email} isOwner={isOwner} />;
}
