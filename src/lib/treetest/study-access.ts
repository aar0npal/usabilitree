import "server-only";

import { db } from "@/db";
import { studies, studyCollaborators } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";
import { and, eq } from "drizzle-orm";

/** Owners manage the study; collaborators can only view its results. */
export type StudyRole = "owner" | "collaborator";

export function hasStudyRole(role: StudyRole | null, required: StudyRole): boolean {
  if (role === "owner") return true;
  return role === "collaborator" && required === "collaborator";
}

/** Returns the user's role on the study, or null if the study is missing or not shared with them. */
export async function getStudyRole(
  studyId: string,
  user: { id: string; email: string }
): Promise<StudyRole | null> {
  const [row] = await db
    .select({ ownerId: studies.userId, collaboratorId: studyCollaborators.id })
    .from(studies)
    .leftJoin(
      studyCollaborators,
      and(eq(studyCollaborators.studyId, studies.id), eq(studyCollaborators.email, user.email))
    )
    .where(eq(studies.id, studyId))
    .limit(1);

  if (!row) return null;
  if (row.ownerId === user.id) return "owner";
  return row.collaboratorId !== null ? "collaborator" : null;
}

/**
 * Guard for server actions. Mirrors the results page: owners and collaborators can view,
 * only owners can change anything. Throws ForbiddenError for missing studies too, so the
 * two cases look the same to the caller.
 */
export async function requireStudyAccess(studyId: string, required: StudyRole = "collaborator") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const role = await getStudyRole(studyId, user);
  if (!hasStudyRole(role, required)) throw new ForbiddenError();

  return { user, role };
}
