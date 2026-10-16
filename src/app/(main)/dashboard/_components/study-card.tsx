"use client";

import { Pencil2Icon, LinkIcon, BarChartIcon, UsersIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Studies } from "@/db/schema";
import { DASHBOARD_TOUR_STEP_IDS } from "@/lib/constants";
import * as React from "react";

interface StudyCardProps {
  study: Studies;
  userName?: string;
  isOwner: boolean;
}

export const StudyCard = ({ study, userName, isOwner }: StudyCardProps) => {
  const isSampleStudy =
    study.title === "Sample tree test" &&
    study.description === "Government website example" &&
    study.status === "active" &&
    isOwner;

  const resultsUrl = `/treetest/results/${study.id}`;
  const editUrl = `/treetest/setup/${study.id}`;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`/treetest/${study.id}`, "_blank");
  };

  const handleCardClick = () => {
    if (study.status === "draft") {
      if (isOwner) window.location.href = editUrl;
    } else {
      window.location.href = resultsUrl;
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = editUrl;
  };

  const handleResultsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = resultsUrl;
  };

  return (
    <div
      className="block h-full"
      id={isSampleStudy ? DASHBOARD_TOUR_STEP_IDS.SAMPLE_STUDY : undefined}
    >
      <Card
        className={`flex h-full flex-col transition-all duration-200 @container ${
          study.status === "draft" && !isOwner
            ? ""
            : "cursor-pointer hover:-translate-y-1 hover:bg-accent/20 hover:shadow-lg"
        }`}
        onClick={handleCardClick}
      >
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="line-clamp-2 flex items-center gap-2">
              {study.title}
              {!isOwner && <UsersIcon className="h-4 w-4 text-muted-foreground" />}
            </div>
            {study.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="z-10 h-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleLinkClick}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
          <CardDescription className="flex flex-col space-y-1 text-sm">
            {userName && <span>Shared by {userName}</span>}
            <span>
              {new Date(Number(study.createdAt) / 1000).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="line-clamp-3 text-sm text-muted-foreground">{study.description}</p>
        </CardContent>
        <CardFooter className="mt-auto flex-shrink-0 items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`flex-shrink-0 rounded-lg capitalize ${
              study.status === "active" ? "bg-green-50 text-green-700" : ""
            }`}
          >
            {study.status}
          </Badge>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {study.status === "draft" ? (
              isOwner && (
                <button
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={handleEditClick}
                >
                  <Pencil2Icon className="h-4 w-4" />
                  <span className="hidden @[275px]:inline">Edit</span>
                </button>
              )
            ) : (
              <>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={handleResultsClick}
                >
                  <BarChartIcon className="h-4 w-4" />
                  <span className="hidden @[275px]:inline">Results</span>
                </button>
                {isOwner && (
                  <button
                    className="flex items-center gap-1 transition-colors hover:text-foreground"
                    onClick={handleEditClick}
                  >
                    <Pencil2Icon className="h-4 w-4" />
                    <span className="hidden @[275px]:inline">Edit</span>
                  </button>
                )}
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
