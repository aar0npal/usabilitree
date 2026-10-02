"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect, KeyboardEvent } from "react";
import { toast } from "sonner";
import {
  addStudyCollaborator,
  getStudyCollaborators,
  removeStudyCollaborator,
  type Collaborator,
} from "@/lib/treetest/results-actions";
import { Skeleton } from "@/components/ui/skeleton";
import * as Sentry from "@sentry/react";
import { RESULTS_TOUR_STEP_IDS } from "@/lib/constants";

interface SharingTabProps {
  studyId: string;
  userEmail: string;
  isOwner: boolean;
}

export function SharingTab({ studyId, userEmail, isOwner }: SharingTabProps) {
  const [emailInput, setEmailInput] = useState("");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
      const data = await getStudyCollaborators(studyId);
      setCollaborators(data);
    } catch (error) {
      toast.error("Failed to load collaborators");
      Sentry.captureException(error);
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (!emailInput) return;

      // Check if trying to add owner's email
      if (emailInput === userEmail) {
        toast.error("You cannot add yourself as a collaborator");
        return;
      }

      if (isValidEmail(emailInput)) {
        if (!collaborators.some((c) => c.email === emailInput)) {
          try {
            await addStudyCollaborator(studyId, emailInput);
            await loadCollaborators();
            setEmailInput("");
            toast.success("Collaborator added successfully");
          } catch (error) {
            toast.error("Failed to add collaborator");
            Sentry.captureException(error);
          }
        } else {
          toast.error("This email is already a collaborator");
        }
      } else {
        toast.error("Please enter a valid email address");
      }
    }
  };

  const handleRemove = async (collaborator: Collaborator) => {
    try {
      await removeStudyCollaborator(studyId, collaborator.id);
      await loadCollaborators();
      toast.success("Collaborator removed successfully");
    } catch (error) {
      toast.error("Failed to remove collaborator");
      Sentry.captureException(error);
    }
  };

  const handleCopyStudyLink = async () => {
    const link = `${window.location.origin}/treetest/${studyId}`;

    if (!navigator.clipboard) {
      toast.error("Clipboard not available in this browser");
      return;
    }

    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({
          name: "clipboard-write" as PermissionName,
        });
        if (result.state === "denied") {
          toast.error("Clipboard access denied by browser settings");
          return;
        }
      } catch {
        // Permission query not supported, proceed anyway
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Study link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-32" /> {/* Title */}
        {/* Study Link Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" /> {/* Card Title */}
            <Skeleton className="mt-2 h-4 w-full" /> {/* Description line 1 */}
            <Skeleton className="mt-1 h-4 w-3/4" /> {/* Description line 2 */}
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" /> {/* Input field */}
              <Skeleton className="h-10 w-16" /> {/* Copy button */}
              <Skeleton className="h-10 w-16" /> {/* Open button */}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" /> {/* Card Title */}
            <Skeleton className="mt-2 h-4 w-full" /> {/* Description line 1 */}
            <Skeleton className="mt-1 h-4 w-3/4" /> {/* Description line 2 */}
          </CardHeader>
          <CardContent className="space-y-4">
            {isOwner && (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" /> {/* Input field */}
                <Skeleton className="h-4 w-56" /> {/* Helper text */}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {/* Skeleton badges */}
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-7 w-32 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id={RESULTS_TOUR_STEP_IDS.SHARING} className="space-y-6">
      <h2 className="text-lg font-semibold">Public Link and Sharing Results</h2>

      <Card>
        <CardHeader>
          <CardTitle>Study Link</CardTitle>
          <CardDescription>
            Share this link with participants to let them take your tree test. You can also use the
            buttons in the header above to quickly copy or open this link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            <Input
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/treetest/${studyId}`}
              readOnly
              className="flex-1"
            />
            <div className="flex justify-between space-x-2">
              <Button
                variant="outline"
                className="h-9 shrink-0 gap-2"
                onClick={handleCopyStudyLink}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                className="h-9 shrink-0 gap-2"
                onClick={() => window.open(`/treetest/${studyId}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collaborators</CardTitle>
          <CardDescription>
            {isOwner
              ? "Add email addresses of people you want to share the results with. They will need to have an account to access the results."
              : "View other collaborators who have access to these results."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwner && (
            <div className="space-y-2">
              <Input
                placeholder="Enter email addresses and press Enter"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <p className="text-xs text-muted-foreground">Press Enter or comma to add an email</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {collaborators.map((collaborator) => (
              <Badge key={collaborator.id} variant="secondary" className="px-2 py-1">
                {collaborator.email}
                {isOwner && (
                  <button
                    onClick={() => handleRemove(collaborator)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {collaborators.length === 0 && (
              <p className="text-sm text-muted-foreground">No collaborators yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
