"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useIdleTimer } from "react-idle-timer";
import { TreeTestComponent } from "@/components/tree-test";
import { loadTestConfig } from "@/lib/treetest/actions";
import { TreeTestConfig } from "@/lib/types/tree-test";
import { shuffle } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/tree-test-loading-skeleton";
import { safeStorage } from "@/lib/safe-storage";

export default function TreeTestPage({ params }: { params: { id: string } }) {
  const [config, setConfig] = useState<TreeTestConfig>();
  const [initialTaskIndex, setInitialTaskIndex] = useState(0);
  const [savedActiveTime, setSavedActiveTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>();
  // Use a ref to prevent duplicate fetches in development strict mode
  const configFetchedRef = useRef(false);

  // Start the idle timer
  const { getTotalActiveTime } = useIdleTimer({
    timeout: 1000 * 60 * 3, // 3 minutes
    startOnMount: true,
    onIdle: () => {
      console.log("User is idle");
      storeActiveTime();
    },
    onAction: () => {
      // Periodically store active time
      if (Math.random() < 0.1) {
        storeActiveTime();
      }
    },
    debounce: 500,
  });

  // Store task index in storage - defined with useCallback to memoize
  const storeTaskIndex = useCallback(
    (taskIndex: number) => {
      safeStorage.setItem(`treeTest_${params.id}_currentTask`, taskIndex.toString());
    },
    [params.id]
  );

  // Store active time in storage - defined with useCallback to memoize
  const storeActiveTime = useCallback(() => {
    const totalActiveTime = getTotalActiveTime() + savedActiveTime;
    safeStorage.setItem(`treeTest_${params.id}_activeTime`, totalActiveTime.toString());
  }, [getTotalActiveTime, params.id, savedActiveTime]);

  useEffect(() => {
    // Skip if already fetched to prevent double fetching in development
    if (configFetchedRef.current) return;

    const fetchConfig = async () => {
      configFetchedRef.current = true; // Mark as fetched immediately
      try {
        const participantId = safeStorage.getItem("participantId");
        const orderKey = `treeTest_${params.id}_taskOrder`;
        const currentTaskKey = `treeTest_${params.id}_currentTask`;
        let config: TreeTestConfig;

        if (participantId) {
          config = await loadTestConfig(params.id, false, participantId);
          if (config.participantId === participantId) {
            // Retrieve the stored task index and active time from storage
            const activeTimeKey = `treeTest_${params.id}_activeTime`;
            const storedActiveTime = safeStorage.getItem(activeTimeKey);
            const storedCurrentTask = safeStorage.getItem(currentTaskKey);
            if (storedActiveTime) {
              const parsedActiveTime = parseInt(storedActiveTime, 10);
              // Check if the stored active time is valid
              if (parsedActiveTime >= 0) {
                setSavedActiveTime(parsedActiveTime);
              }
            }
            if (storedCurrentTask) {
              const parsedCurrentTask = parseInt(storedCurrentTask, 10);
              // Check if the stored task index is valid
              if (parsedCurrentTask >= 0 && config.tasks) {
                if (parsedCurrentTask < config.tasks.length) {
                  // Set before order restoration — if restoration succeeds, this value
                  // is correct (index maps to stored order). If it fails, the restoration
                  // block calls setInitialTaskIndex(0) which overwrites this (React batching).
                  setInitialTaskIndex(parsedCurrentTask);
                } else {
                  // If the stored task index is out of bounds, reset to 0
                  setInitialTaskIndex(0);
                  storeTaskIndex(0); // Reset task index in storage
                }
              }
            }
          } else {
            // If the participantId doesn't match, set the new one
            if (config.participantId) {
              safeStorage.setItem("participantId", config.participantId);
            }
            safeStorage.removeItem(currentTaskKey); // Clear stale index so fresh start is detected
            safeStorage.removeItem(orderKey); // Clear any stale order from the previous session
            setInitialTaskIndex(0);
          }
        } else {
          config = await loadTestConfig(params.id);
          if (config.participantId) {
            safeStorage.setItem("participantId", config.participantId);
          }
          // Clear any stale keys from a previous session for this study
          safeStorage.removeItem(currentTaskKey);
          safeStorage.removeItem(orderKey);
        }
        const storedOrder = safeStorage.getItem(orderKey);
        // Detect in-progress participants — null means fresh start
        const priorTaskIndex = safeStorage.getItem(currentTaskKey);
        let hasProgress = priorTaskIndex !== null;
        let restored = false;

        if (storedOrder) {
          try {
            const order: string[] = JSON.parse(storedOrder);
            const reordered = order
              .map((id) => config.tasks.find((t) => t.id === id))
              .filter(Boolean) as typeof config.tasks;
            if (reordered.length === config.tasks.length) {
              // Restore stored order regardless of whether randomizeTasks is still on
              config = { ...config, tasks: reordered };
              restored = true;
            } else {
              // Task count changed — clear stale order and reset progress
              safeStorage.removeItem(orderKey);
              safeStorage.removeItem(currentTaskKey);
              setInitialTaskIndex(0);
              hasProgress = false;
            }
          } catch {
            // Corrupted value — clear and reset progress
            safeStorage.removeItem(orderKey);
            safeStorage.removeItem(currentTaskKey);
            setInitialTaskIndex(0);
            hasProgress = false;
          }
        }

        if (!restored && config.randomizeTasks && !hasProgress) {
          // Only shuffle for fresh starts — don't reshuffle mid-study if owner
          // enabled randomization after the participant already began
          const shuffled = shuffle(config.tasks);
          safeStorage.setItem(orderKey, JSON.stringify(shuffled.map((t) => t.id)));
          config = { ...config, tasks: shuffled };
        }

        setConfig(config);
        setIsInitialized(true);
      } catch (err) {
        console.error("Failed to load test config:", err);
        setError("Failed to load the study. Please try refreshing the page.");
      }
    };

    fetchConfig();
  }, [params.id, storeTaskIndex]);

  useEffect(() => {
    // Your existing beforeunload handler
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      storeActiveTime();
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // Add visibility change handler as backup
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        storeActiveTime();
      }
    };

    if (config && config.tree.length > 0 && config.tasks.length > 0) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [config, storeActiveTime]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="rounded-lg bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!config || !isInitialized) {
    return <LoadingSkeleton />;
  }

  return (
    <TreeTestComponent
      config={config}
      initialTaskIndex={initialTaskIndex}
      onTaskChange={(taskIndex) => {
        storeTaskIndex(taskIndex);
        storeActiveTime();
      }}
    />
  );
}
