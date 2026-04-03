"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Update = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix" | "message";
  details?: string[];
};

/** Parse YYYY-MM-DD as a local calendar date (ISO date-only strings parse as UTC and can show the wrong day). */
function parseCalendarDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return new Date(NaN);
  }
  return new Date(y, m - 1, d);
}

/** Format a YYYY-MM-DD string for display, falling back to "Unknown date" if the input is malformed. */
function formatCalendarDate(ymd: string): string {
  const date = parseCalendarDate(ymd);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const updates: Update[] = [
  {
    id: "1",
    date: "2024-11-10",
    title: "Initial Launch",
    description: "First release of Usabilitree with basic features.",
    type: "feature",
    details: [
      "Basic authentication system",
      "Study creation interface",
      "Initial dashboard layout",
      "Core database structure",
    ],
  },
  {
    id: "2",
    date: "2024-11-15",
    title: "Tree Test Feature Release",
    description: "Added tree testing functionality to help evaluate information architecture.",
    type: "feature",
    details: [
      "Create and customize tree test studies",
      "Define tasks and expected paths",
      "Comprehensive results analysis",
      "Path analysis visualization",
      "Success metrics dashboard",
      "Share studies with collaborators",
    ],
  },
  {
    id: "3",
    date: "2025-02-10",
    title: "Development Update",
    description: "Hello everyone! I wanted to give you a quick update on the development status.",
    type: "message",
    details: [
      "I'm the sole developer working on this website, currently a graduating Computer Science student.",
      "I took a 2-month break to rest and focus on other academic commitments.",
      "I'm now back and excited to continue working on improving the platform!",
      "Thank you for using Usabilitree! Your continued use of the platform means a lot.",
      "I'll be using this Updates page to keep you informed of new features and changes.",
      "For any issues or suggestions, feel free to DM me on Discord: @pseudo1337",
      "Pro tip: If you're coming from UXTweak or Optimal Workshop, you can create your tree test there first, export to CSV, then copy-paste the structure here for easy setup!",
    ],
  },
  {
    id: "4",
    date: "2025-04-27",
    title: "Platform Improvements",
    description: "Various improvements and bug fixes to the tree test functionality",
    type: "improvement",
    details: [
      "Increased study limit to 7 (temporary, may change when pricing tiers are introduced)",
      "Fixed bug in tracking participant's path taken, causing incorrect Directness score calculation",
      "Improved tree test for participants, now tracks current task which allows them to resume when they reload or reopen the tab",
      "Improved notes and placeholder messages in tree tab setup",
      "Added tooltip to dashboard link for unsaved changes warning",
      "Added advisory note on deleting participant results",
      'Added "Back to top" button in tasks tab setup',
      'Added "Copy from Existing Study" button in general tab setup',
      "Optimized database queries",
    ],
  },
  {
    id: "5",
    date: "2025-05-11",
    title: "Time Tracking & UI Improvements",
    description: "Fixed participant time tracking and added more information",
    type: "fix",
    details: [
      "Fixed UI bug covering the Start Task button with the task description in the tree test.",
      "Fixed UI bug where tree test with single top-level item expands all children.",
      "Fixed participant's total time taken calculation. It now records active time instead of simply subtracting start and end timestamps.",
      "Added a 3-minute idle/inactivity timeout threshold that pauses active time recording.",
      "Added more information and tooltip notes to the Time column and Duration in participant modal.",
    ],
  },
  {
    id: "6",
    date: "2025-05-11",
    title: "Development Message",
    description: "Platform update plan and study limit increase",
    type: "message",
    details: [
      "Hello! I've added the fixes needed thanks to the users who reached out to me.",
      "I'm currently working on rewriting the whole site to improve UI, security, documentation, tree test data collection, and add card sorting tests.",
      "New improvements to the tree test will be part of that update but if there's a feature you need right away or a bug that needs fixing, please DM me on Discord (@pseudo1337) and I'll try to add it ASAP.",
      "I've increased the study limit to 7 while I work on the pricing tier update.",
      "If you need more studies, we can discuss this in DMs (charges may apply 😄).",
    ],
  },
  {
    id: "7",
    date: "2025-06-28",
    title: "Fixes and Improvements",
    description: "Fixes and improvements to existing features",
    type: "fix",
    details: [
      "Fixed UI bug in tree test where expanded items were not seen properly due to limited scrolling.",
    ],
  },
  {
    id: "8",
    date: "2025-08-28",
    title: "Export Study Data to Excel",
    description:
      "Added ability to export study results data to an Excel (.xlsx) file and UI improvements",
    type: "feature",
    details: [
      "Access export option in the 'Export' tab within study results.",
      "Export includes participant's task results, and performance metrics.",
      "Add Edit study button for live and completed studies.",
    ],
  },
  {
    id: "9",
    date: "2025-09-12",
    title: "New Demo and UI Improvements",
    description: "Added new demo and UI improvements",
    type: "improvement",
    details: [
      "Added new sample tree test study template for users to quickly create and explore the platform.",
      "Improved button loading UI in instruction page of tree test.",
      "Improved study card UI in dashboard.",
      "Added 'Result' button in the setup page for active studies to quickly access results.",
    ],
  },
  {
    id: "10",
    date: "2025-09-13",
    title: "Onboarding and UI Improvements",
    description:
      "Added a tour feature to guide new users through the platform and some improvements",
    type: "improvement",
    details: [
      "Added a tour feature that guides new users through the main features of the platform.",
      "Fixed text typos and improved some UI elements for better user experience.",
    ],
  },
  {
    id: "11",
    date: "2025-09-17",
    title: "Fixes and Improvements",
    description: "Fixes and improvements to existing features",
    type: "improvement",
    details: [
      "Fixed bug in participants tab in study results where closing the details modal caused UI issues.",
      "Improved participants tab UI in study results.",
      "Added guided tour to sample tree test setup and result pages.",
      "Added banner with a note for tree test preview.",
      "Added study link to sharing tab in study results.",
    ],
  },
  {
    id: "12",
    date: "2025-09-18",
    title: "UI Fix",
    description: "Fixed preview mode banner UI issue and improved markdown rendering",
    type: "fix",
  },
  {
    id: "13",
    date: "2025-09-19",
    title: "UI Improvement",
    description: "Improved navigation experience in tree test setup",
    type: "improvement",
    details: ["Back to dashboard now auto-saves changes instead of showing a blocking tooltip"],
  },
  {
    id: "14",
    date: "2025-09-25",
    title: "UI Text Customization & Language Presets",
    description:
      "Added comprehensive language presets and made all interface text customizable in tree test",
    type: "feature",
    details: [
      "Made ALL interface text in tree test customizable including buttons, messages, and dialog text",
      "Added language preset dropdown with 5 pre-translated languages: English, Spanish, French, German, and Portuguese",
      "One-click language application - select a language and all text fields populate automatically",
    ],
  },
  {
    id: "15",
    date: "2025-09-28",
    title: "Setup page UI Improvement",
    description: "Improved study card navigation and tree test setup page",
    type: "improvement",
    details: [
      "Study cards now show both 'Edit' and 'Results' actions for active/completed studies",
      "Removed onboarding in results page for sample study",
      "Removed sample study option in new study dialog",
      "Improved tree and tasks setup page for better usability",
      "Add interactive preview of tree structure in tree setup page",
      "Added note for branding in messages setup",
    ],
  },
  {
    id: "16",
    date: "2025-10-08",
    title: "Fixes and Improvements",
    description: "Fixed bugs and improved UI in tree test results",
    type: "fix",
    details: [
      "Fixed study card overflow issue on smaller screens",
      "Fixed visibility issue in tree setup where tree preview text was not visible in dark mode",
      "Improved confidence ratings graph in task analysis tab",
    ],
  },
  {
    id: "17",
    date: "2025-10-08",
    title: "Development Message",
    description:
      "Hi! I'm building this open-source website solo, and it's free! Please send your feedback to help me improve this tool! Feel free to email me at aaron@usabilitree.com or DM me on Discord @pseudo1337. Thanks for using Usabilitree!",
    type: "message",
    details: [],
  },
  {
    id: "18",
    date: "2025-11-07",
    title: "Fix answer path validation and UI hint",
    description:
      "Require leading '/' for task answer paths and add UI hint to clarify this requirement.",
    type: "fix",
    details: [
      'Now, task answer paths must start with a "/" (e.g., /home/products) to be considered valid.',
      "Added a small helper text above the answers textarea to clarify this requirement for users.",
    ],
  },
  {
    id: "19",
    date: "2026-01-26",
    title: "Platform Updates",
    description: "Various improvements and updates to the platform",
    type: "improvement",
    details: [
      "Fixed image rendering with alt text in markdown preview.",
      "Switched from BuyMeACoffee to GitHub Sponsors for supporting the project.",
      "Added Roadmap button to easily view upcoming features and planned improvements.",
      "Fixed minor display errors for smoother user experience.",
    ],
  },
  {
    id: "20",
    date: "2026-01-27",
    title: "Results & Path Matching Fixes",
    description:
      "Fixed stats not updating after modifying correct answers and improved path matching accuracy.",
    type: "fix",
    details: [
      "Results now properly refresh when you edit correct answer paths for tasks.",
      "Improved path matching to handle truncated paths - fixes cases where participant paths were incorrectly marked as wrong.",
      "Fixed 'Incorrect Destinations' table to use full-path matching instead of last-segment-only comparison.",
    ],
  },
  {
    id: "21",
    date: "2026-01-28",
    title: "Clipboard & Feedback Fixes",
    description: "Fixed clipboard permission errors and improved feedback button reliability.",
    type: "fix",
    details: [
      "Fixed clipboard errors that occurred when browser denied permission - now shows appropriate fallback message.",
      "Added failsafe for Feedback and Roadmap buttons - opens in new tab if widget fails to load.",
    ],
  },
  {
    id: "22",
    date: "2026-01-29",
    title: "Widget Proxy Fix",
    description: "Fixed CORS errors preventing Feedback and Roadmap widgets from loading.",
    type: "fix",
  },
  {
    id: "23",
    date: "2026-01-29",
    title: "Thank You for Reaching 1,000 Users! 🎉",
    description: "A personal message from me as we've reached this incredible milestone.",
    type: "message",
    details: [
      "We've officially reached 1,000 users! I'm genuinely grateful for every single one of you.",
      "It's been amazing to see how UsabiliTree has supported so many teams with their UX research, even with just tree testing available so far.",
      "I know I've mentioned working on Version 2 with card sorting and other features in previous updates. I'll be honest - progress has been slower than I hoped due to some personal circumstances.",
      "But I want you to know: this project matters to me, and your continued use motivates me to keep improving it.",
      "The roadmap is now live! Check it out to see what's planned, upvote features you'd like to see prioritized, and share your ideas in the comments.",
      "Your feedback genuinely shapes where this tool goes next - whether it's a quick note via the Feedback button or detailed thoughts on the roadmap.",
      "Thank you for sticking with UsabiliTree. Here's to many more improvements ahead! 🚀",
    ],
  },
  {
    id: "24",
    date: "2026-01-31",
    title: "Participants Tab Improvements",
    description:
      "Added pagination, keyboard navigation, and improved status tracking for participant results.",
    type: "improvement",
    details: [
      "Added pagination to participants table - choose between 10, 25, 50, 100, or 200 per page for better performance with large studies.",
      "Added keyboard shortcuts (← →) to navigate between participants in the details modal.",
      "Page automatically updates when navigating to a participant on a different page.",
      "Added 'In Progress' status for participants active within the last 4 minutes (previously only showed Completed/Abandoned).",
      "Updated status tooltip to explain the three status types.",
    ],
  },
  {
    id: "25",
    date: "2026-03-06",
    title: "Randomize Tasks & Fixes",
    description: "Added task randomization for tree tests and fixed several UI and access issues.",
    type: "improvement",
    details: [
      "Added 'Randomize task order' option in study setup — each participant sees tasks in a unique shuffled order. Preview mode also randomizes on each load.",
      "Fixed logo in the app header incorrectly linking to the landing page instead of the dashboard.",
      "Fixed collaborators being able to access the Edit page via study cards on the dashboard.",
      "Improved loading UI in the tree test page.",
      "Improved clarity of the participant status tooltip.",
    ],
  },
  {
    id: "26",
    date: "2026-03-17",
    title: "Theme Display Fixes",
    description: "Improved how light and dark mode behave across pages.",
    type: "fix",
    details: [
      "Participant test links now always open in light mode, the rest of the site continues to follow system theme or user preference.",
    ],
  },
  {
    id: "27",
    date: "2026-04-02",
    title: "Billing & Study Limit Update",
    description:
      "Introduced billing and temporarily reverting the free study limit to 3 for new accounts.",
    type: "message",
    details: [
      "Hello! I've added billing to the platform. Thank you so much for your continued support, it truly means a lot. 🙏",
      "Because many users have reached the 7-study limit, I'm reverting the default free limit back to 3 studies for new accounts going forward.",
      "Don't worry, if you already have an account your current study limit is retained. Nothing changes for you.",
      "Any purchased study limits are also retained indefinitely, so there will be no issues when the overhaul launches.",
      "This pricing is temporary. I'm actively focusing on the overhaul, which will bring a proper pricing structure along with major improvements.",
      "Thank you for your patience and support. It genuinely keeps this project going! 🚀",
    ],
  },
];

export function UpdatesList() {
  const reversed = [...updates].reverse();
  return (
    <div className="space-y-4">
      {reversed.map((update, i) => (
        <motion.div
          key={update.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
            delay: Math.min(i * 0.04, 0.24),
          }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{update.title}</CardTitle>
                <Badge
                  variant={
                    update.type === "feature"
                      ? "default"
                      : update.type === "improvement"
                        ? "secondary"
                        : update.type === "message"
                          ? "green"
                          : "outline"
                  }
                >
                  {update.type}
                </Badge>
              </div>
              <time className="text-sm text-muted-foreground">
                {formatCalendarDate(update.date)}
              </time>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{update.description}</p>
              {update.details && (
                <ul className="ml-4 list-disc text-sm text-muted-foreground">
                  {update.details.map((detail, index) => (
                    <li key={index} className="mt-1">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
