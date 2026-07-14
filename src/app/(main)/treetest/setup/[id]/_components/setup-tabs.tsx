"use client";

import {
  ArrowLeftIcon,
  SaveIcon,
  EyeOpenIcon,
  TrashIcon,
  RocketIcon,
  WorkflowIcon,
  GearIcon,
  FileTextIcon,
  ChecklistIcon,
  MessageSquareCodeIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import {
  updateStudyStatus,
  deleteStudy,
  saveStudyData,
  loadStudyData,
  getStudyDetails,
} from "@/lib/treetest/actions";
import { useRouter } from "next/navigation";
import { GeneralTab } from "./general-tab";
import { TreeTab } from "./tree-tab";
import { TasksTab } from "./tasks-tab";
import { MessagesTab } from "./messages-tab";
import { StudyFormData } from "@/lib/types/tree-test";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";
import { TriangleAlertIcon } from "lucide-react";
import TourSetup from "./setup-tour";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";

interface SetupTabsProps {
  params: {
    id: string;
  };
  showTour?: boolean;
}

export default function SetupTabs({ params, showTour = false }: SetupTabsProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<StudyFormData>({
    general: {
      title: "",
      description: "",
      status: "draft",
    },
    tree: {
      structure: "",
      parsed: [],
    },
    tasks: {
      items: [],
      randomizeTasks: false,
    },
    messages: {
      welcome: "",
      completion: "",
    },
    customText: {
      instructions: "",
      startTest: "",
      findItHere: "",
      selectAsAnswer: "",
      startTask: "",
      confidenceQuestion: "",
      stronglyAgree: "",
      stronglyDisagree: "",
      taskProgress: "",
      skipTask: "",
      submitContinue: "",
      completedMessage: "",
      nextButton: "",
      confidenceDescription: "",
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [status, setStatus] = useState("draft");
  const [activeTab, setActiveTab] = useState("general");
  const [isTourCompletedInStorage, setIsTourCompletedInStorage] = useState(false);

  // Load initial data
  useEffect(() => {
    Promise.all([loadStudyData(params.id), getStudyDetails(params.id)])
      .then(([data, details]) => {
        setFormData(data);
        setStatus(details.status);
      })
      .catch((error) => {
        toast.error("Failed to load study data");
        Sentry.captureException(error);
      });
  }, [params.id]);

  // Check for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Detect unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  // Check localStorage for tour completion status
  useEffect(() => {
    const tourCompleted = localStorage.getItem("setup-tour-completed");
    setIsTourCompletedInStorage(tourCompleted === "true");
  }, []);

  // Handle tour completion
  const handleTourComplete = () => {
    localStorage.setItem("setup-tour-completed", "true");
    setIsTourCompletedInStorage(true);
  };

  // Only show tour if explicitly requested and not completed
  const shouldShowTour = showTour && !isTourCompletedInStorage;

  // Memoize the tour actions to prevent infinite update loops
  const tourActions = useMemo(
    () => ({
      [SETUP_TOUR_STEP_IDS.GENERAL]: () => setActiveTab("general"),
      [SETUP_TOUR_STEP_IDS.TREE]: () => setActiveTab("tree"),
      [SETUP_TOUR_STEP_IDS.TASKS]: () => setActiveTab("tasks"),
      [SETUP_TOUR_STEP_IDS.MESSAGES]: () => setActiveTab("messages"),
      // For buttons, these don't change tabs but are used for highlighting
      [SETUP_TOUR_STEP_IDS.SAVE]: () => {},
      [SETUP_TOUR_STEP_IDS.PREVIEW]: () => {},
      [SETUP_TOUR_STEP_IDS.RESULTS]: () => {},
      [SETUP_TOUR_STEP_IDS.DELETE]: () => {},
    }),
    []
  );

  const getValidationErrors = () => {
    const errors = [];

    if (!formData.general.title?.trim()) {
      errors.push("Title is required");
    }

    if (formData.tree.parsed.length === 0) {
      errors.push("Tree structure is empty");
    }

    const tasksWithoutDescription = formData.tasks.items.filter(
      (task) => !task.description?.trim()
    ).length;

    const tasksWithoutAnswer = formData.tasks.items.filter(
      (task) => task.description?.trim() && !task.answer?.trim()
    ).length;

    const validTasks = formData.tasks.items.filter(
      (task) => task.description?.trim() && task.answer?.trim()
    ).length;

    if (formData.tasks.items.length === 0) {
      errors.push("At least one task is required");
    } else if (validTasks === 0) {
      if (tasksWithoutDescription > 0 && tasksWithoutAnswer > 0) {
        errors.push("Tasks need descriptions and correct answers");
      } else if (tasksWithoutDescription > 0) {
        errors.push("Tasks need descriptions");
      } else if (tasksWithoutAnswer > 0) {
        errors.push("Tasks need correct answers");
      }
    }

    return errors;
  };

  const canLaunchOrPreview = () => {
    return getValidationErrors().length === 0;
  };

  const getValidationMessage = () => {
    const errors = getValidationErrors();
    if (errors.length === 0) return "";

    if (errors.length === 1) {
      return errors[0];
    }

    return `Missing: ${errors.join(", ")}`;
  };

  const hasTreeErrors = () => {
    return formData.tree.parsed.length === 0;
  };

  const hasTaskErrors = () => {
    const validTasks = formData.tasks.items.filter(
      (task) => task.description?.trim() && task.answer?.trim()
    ).length;

    return formData.tasks.items.length === 0 || validTasks === 0;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveStudyData(params.id, formData);
      toast.success("Study saved successfully");
    } catch (error) {
      toast.error("Failed to save study");
      Sentry.captureException(error);
    } finally {
      setIsSaving(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleLaunch = async () => {
    if (!canLaunchOrPreview()) {
      toast.error(getValidationMessage());
      return;
    }

    if (hasUnsavedChanges) {
      setIsSaving(true);
      try {
        await saveStudyData(params.id, formData);
        toast.success("Study saved successfully");
      } catch (error) {
        toast.error("Failed to save study");
        Sentry.captureException(error);
      } finally {
        setIsSaving(false);
        setHasUnsavedChanges(false);
      }
    }

    setIsLaunching(true);
    try {
      await updateStudyStatus(params.id, "active");
      const link = `${window.location.origin}/treetest/${params.id}`;
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Study launched successfully and link copied to clipboard");
      } catch {
        toast.success("Study launched successfully");
      }
      router.push(`/treetest/results/${params.id}`);
    } catch (error) {
      toast.error("Failed to launch study");
      Sentry.captureException(error);
    } finally {
      setIsLaunching(false);
    }
  };

  const handlePreview = async () => {
    if (!canLaunchOrPreview()) {
      toast.error(getValidationMessage());
      return;
    }

    if (hasUnsavedChanges) {
      setIsSaving(true);
      try {
        await saveStudyData(params.id, formData);
        toast.success("Study saved successfully");
      } catch (error) {
        toast.error("Failed to save study");
        Sentry.captureException(error);
      } finally {
        setIsSaving(false);
        setHasUnsavedChanges(false);
      }
    }

    window.open(`/treetest/preview/${params.id}`, "_blank");
  };

  const handleBackToDashboard = async () => {
    if (hasUnsavedChanges) {
      setIsSaving(true);
      try {
        await saveStudyData(params.id, formData);
        toast.success("Study saved successfully");
      } catch (error) {
        toast.error("Failed to save study");
        Sentry.captureException(error);
        return; // Don't navigate if save failed
      } finally {
        setIsSaving(false);
        setHasUnsavedChanges(false);
      }
    }
    router.push("/dashboard");
  };

  return (
    <main className="container min-h-[calc(100vh-160px)] pt-3 md:max-w-screen-md">
      {shouldShowTour && <TourSetup actions={tourActions} onComplete={handleTourComplete} />}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <button
            onClick={handleBackToDashboard}
            disabled={isSaving}
            className="mb-3 flex items-center gap-2 text-sm text-muted-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            {isSaving ? "Saving..." : "back to dashboard"}
            {hasUnsavedChanges && !isSaving && (
              <span className="text-xs text-muted-foreground sm:hidden">(will save changes)</span>
            )}
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <WorkflowIcon /> {formData.general.title || "Set up your Tree Test"}
          </h1>
          <div className="flex items-center gap-1">
            <p className="mt-2 text-muted-foreground">Configure your tree test study settings</p>
            {status !== "draft" && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TriangleAlertIcon className="mr-2 hidden h-4 w-4 text-yellow-500 sm:block" />
                  </TooltipTrigger>
                  <TooltipContent>
                    This study is {status}. Editing will not affect past participants&apos; answers.
                    Proceed with caution.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {status !== "draft" && (
            <p className="mt-1 block text-sm text-yellow-600 sm:hidden">
              Warning: This study is {status}. Editing will not affect past participants&apos;
              answers. Proceed with caution.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            id={SETUP_TOUR_STEP_IDS.SAVE}
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            <SaveIcon className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
            {hasUnsavedChanges && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-theme"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-theme"></span>
              </span>
            )}
          </Button>

          {status === "draft" && (
            <AlertDialog>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!canLaunchOrPreview()}
                        asChild
                      >
                        <AlertDialogTrigger>
                          <RocketIcon className="h-4 w-4" /> Launch
                        </AlertDialogTrigger>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canLaunchOrPreview() && (
                    <TooltipContent>{getValidationMessage()}</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Launch Study?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make your study live and available to participants. You can edit it
                    later but existing participants&apos; answers will not be affected. A link to
                    the study will be copied to your clipboard for easy sharing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLaunch}
                    disabled={isLaunching || isSaving}
                    className="gap-2"
                  >
                    {isLaunching ? (
                      <>Launching...</>
                    ) : isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <RocketIcon className="h-4 w-4" /> Launch Study
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {status !== "draft" && (
            <Link href={`/treetest/results/${params.id}`}>
              <Button
                id={SETUP_TOUR_STEP_IDS.RESULTS}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChecklistIcon className="h-4 w-4" />
                Results
              </Button>
            </Link>
          )}

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    id={SETUP_TOUR_STEP_IDS.PREVIEW}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handlePreview}
                    disabled={isSaving}
                  >
                    <EyeOpenIcon className="h-4 w-4" />
                    Preview
                  </Button>
                </span>
              </TooltipTrigger>
              {(!canLaunchOrPreview() || isSaving) && (
                <TooltipContent>
                  {isSaving ? "Saving changes..." : getValidationMessage()}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <AlertDialog>
            <Button
              id={SETUP_TOUR_STEP_IDS.DELETE}
              variant="ghost"
              size="sm"
              className="text-destructive"
              asChild
            >
              <AlertDialogTrigger>
                <TrashIcon className="h-4 w-4" />
              </AlertDialogTrigger>
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Study?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your study and all
                  associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteStudy(params.id);
                    router.push("/dashboard");
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Study
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full">
        <TabsList className="flex h-auto w-full flex-wrap items-center justify-start">
          <TabsTrigger value="general" className="gap-2">
            <GearIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="tree" className="relative gap-2">
            <FileTextIcon className="h-4 w-4" />
            Tree
            {hasTreeErrors() && (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="relative gap-2">
            <ChecklistIcon className="h-4 w-4" />
            Tasks
            {hasTaskErrors() && (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquareCodeIcon className="h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab data={formData} studyId={params.id} status={status} onChange={setFormData} />
        </TabsContent>

        <TabsContent value="tree">
          <TreeTab data={formData} onChange={setFormData} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab data={formData} studyId={params.id} status={status} onChange={setFormData} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab data={formData} onChange={setFormData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
