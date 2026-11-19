"use client";

import React, { useState, useEffect } from "react";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Card } from "@/components/ui/card";
import { loadCompletionMessage, updateParticipantCompletion } from "@/lib/treetest/actions";
import { Skeleton } from "@/components/ui/skeleton";
import * as Sentry from "@sentry/react";
import { safeStorage } from "@/lib/safe-storage";

const CompletedPage = ({ params }: { params: { id: string } }) => {
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const participantId = safeStorage.getItem("participantId");
    const savedActiveTime = safeStorage.getItem(`treeTest_${params.id}_activeTime`);
    const activeTime = savedActiveTime ? parseInt(savedActiveTime, 10) / 1000 : null;

    // Update completion time if participantId exists
    if (participantId) {
      updateParticipantCompletion(participantId, activeTime).catch((error) => {
        Sentry.captureException(error);
      });
    }

    // Remove participantId, currentTask, activeTime, and taskOrder from storage
    safeStorage.removeItem("participantId");
    safeStorage.removeItem(`treeTest_${params.id}_currentTask`);
    safeStorage.removeItem(`treeTest_${params.id}_activeTime`);
    safeStorage.removeItem(`treeTest_${params.id}_taskOrder`);

    // Load completion message
    loadCompletionMessage(params.id)
      .then(setCompletionMessage)
      .catch((error) => {
        setError("Failed to load completion message");
        Sentry.captureException(error);
      });
  }, [params.id]);

  if (error) {
    return (
      <>
        <div className="h-1 bg-theme"></div>
        <div className="container mx-auto max-w-2xl py-8">
          <Card className="p-6">
            <div className="text-center text-red-500">{error}</div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-1 bg-theme"></div>
      <div className="container mx-auto max-w-2xl py-8">
        <Card className="p-6">
          {completionMessage === null ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <MarkdownPreview content={completionMessage} />
          )}
        </Card>
      </div>
    </>
  );
};

export default CompletedPage;
