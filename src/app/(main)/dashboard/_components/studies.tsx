import * as React from "react";
import { db } from "@/db";
import { studies as studiesTable, studyCollaborators, users } from "@/db/schema";
import { StudyCard } from "./study-card";
import { NewStudy } from "./new-study";
import { AnimatedItem } from "./animated-item";
import { getCurrentUser } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { env } from "@/env";

export async function Studies() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Get owned studies
  const ownedStudies = await db.select().from(studiesTable).where(eq(studiesTable.userId, user.id));

  // Get collaborated studies
  const collaboratedStudies = await db
    .select({
      study: studiesTable,
      owner: users,
    })
    .from(studyCollaborators)
    .innerJoin(studiesTable, eq(studiesTable.id, studyCollaborators.studyId))
    .innerJoin(users, eq(users.id, studiesTable.userId))
    .where(eq(studyCollaborators.email, user.email));

  const studyLimit = user.studyLimit ?? env.STUDY_LIMIT;
  const studyCount = ownedStudies.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NewStudy
          isEligible={studyCount < studyLimit}
          userId={user.id}
          studyLimit={studyLimit}
          studyCount={studyCount}
          creemProductId={env.NEXT_PUBLIC_CREEM_PRODUCT_ID}
          index={0}
        />
        {ownedStudies.map((study, i) => (
          <AnimatedItem key={study.id} index={i + 1}>
            <StudyCard study={study} isOwner={true} />
          </AnimatedItem>
        ))}
      </div>

      {collaboratedStudies.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Shared with me</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collaboratedStudies.map(({ study, owner }, i) => (
              <AnimatedItem key={study.id} index={i}>
                <StudyCard study={study} userName={owner.email} isOwner={false} />
              </AnimatedItem>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
