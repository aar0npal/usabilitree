"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { studies, treeConfigs, treeTasks, participants, treeTaskResults } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { sampleParticipants } from "./sample-data";
import { count, eq } from "drizzle-orm";
import { canCreateStudy } from "@/lib/billing/study-limit";
import { ForbiddenError } from "@/lib/treetest/forbidden-error";

export async function createSampleTreeTestStudy() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) throw new Error("Unauthorized");

  const userId = sessionUser.id;
  const studyLimit = sessionUser.studyLimit;

  const studyId = nanoid();

  // Sample tree structure from PARANAQUE Govt study
  const treeStructure = `Home
,Transactions & Services
,,Health Permits & Services
,,Business Permits
,,Building & Construction Permits
,,Property Assessment Services
,,Civil Registry Services
,,Online Services
,,,TPMO Online Payment
,,,City Treasurer’s Office — Online Payment Portal
,,,BPLO Services
,,Health Centers & Hygiene Clinics
,,Traffic Fines & Violations
,Government
,,Public-Private Partnership Selection Committee
,,Paranaque Profile
,,Vision/Mission
,,City Officials
,,City Departments
,,City Ordinances
,,Government Events
,Tourism
,,Tourist Sites & Attractions
,,Map of Parañaque City
,,Lifestyle & Events
,,Top Establishments
,Transparency Report
,,Bids and Awards 2024
,,,Quotations (2024)
,,,Awards (2024)
,,,Documents (2024)
,,,Invitation (2024)
,,,Bulletin (2024)
,,,Special BAC Resolution (2024)
,,Bids and Awards 2023
,,,Quotations (2023)
,,,Awards (2023)
,,,Documents (2023)
,,,Invitation (2023)
,,,Bulletin (2023)
,,,Special BAC Resolution (2023)
,,Full Disclosure Report
,,Parañaque Yearly Budget
,,Schedule of Market Value
,Contact Us`;

  // Parsed tree structure
  const parsedTree = [
    {
      name: "Home",
      children: [
        {
          name: "Transactions & Services",
          children: [
            {
              name: "Health Permits & Services",
              link: "/home/transactions-services/health-permits-services",
            },
            { name: "Business Permits", link: "/home/transactions-services/business-permits" },
            {
              name: "Building & Construction Permits",
              link: "/home/transactions-services/building-construction-permits",
            },
            {
              name: "Property Assessment Services",
              link: "/home/transactions-services/property-assessment-services",
            },
            {
              name: "Civil Registry Services",
              link: "/home/transactions-services/civil-registry-services",
            },
            {
              name: "Online Services",
              children: [
                {
                  name: "TPMO Online Payment",
                  link: "/home/transactions-services/online-services/tpmo-online-payment",
                },
                {
                  name: "City Treasurer's Office — Online Payment Portal",
                  link: "/home/transactions-services/online-services/city-treasurers-office-online-payment-portal",
                },
                {
                  name: "BPLO Services",
                  link: "/home/transactions-services/online-services/bplo-services",
                },
              ],
            },
            {
              name: "Health Centers & Hygiene Clinics",
              link: "/home/transactions-services/health-centers-hygiene-clinics",
            },
            {
              name: "Traffic Fines & Violations",
              link: "/home/transactions-services/traffic-fines-violations",
            },
          ],
        },
        {
          name: "Government",
          children: [
            {
              name: "Public-Private Partnership Selection Committee",
              link: "/home/government/public-private-partnership-selection-committee",
            },
            { name: "Paranaque Profile", link: "/home/government/paranaque-profile" },
            { name: "Vision/Mission", link: "/home/government/visionmission" },
            { name: "City Officials", link: "/home/government/city-officials" },
            { name: "City Departments", link: "/home/government/city-departments" },
            { name: "City Ordinances", link: "/home/government/city-ordinances" },
            { name: "Government Events", link: "/home/government/government-events" },
          ],
        },
        {
          name: "Tourism",
          children: [
            {
              name: "Tourist Sites & Attractions",
              link: "/home/tourism/tourist-sites-attractions",
            },
            { name: "Map of Parañaque City", link: "/home/tourism/map-of-paranaque-city" },
            { name: "Lifestyle & Events", link: "/home/tourism/lifestyle-events" },
            { name: "Top Establishments", link: "/home/tourism/top-establishments" },
          ],
        },
        {
          name: "Transparency Report",
          children: [
            {
              name: "Bids and Awards 2024",
              children: [
                {
                  name: "Quotations (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/quotations-2024",
                },
                {
                  name: "Awards (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/awards-2024",
                },
                {
                  name: "Documents (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/documents-2024",
                },
                {
                  name: "Invitation (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/invitation-2024",
                },
                {
                  name: "Bulletin (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/bulletin-2024",
                },
                {
                  name: "Special BAC Resolution (2024)",
                  link: "/home/transparency-report/bids-and-awards-2024/special-bac-resolution-2024",
                },
              ],
            },
            {
              name: "Bids and Awards 2023",
              children: [
                {
                  name: "Quotations (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/quotations-2023",
                },
                {
                  name: "Awards (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/awards-2023",
                },
                {
                  name: "Documents (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/documents-2023",
                },
                {
                  name: "Invitation (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/invitation-2023",
                },
                {
                  name: "Bulletin (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/bulletin-2023",
                },
                {
                  name: "Special BAC Resolution (2023)",
                  link: "/home/transparency-report/bids-and-awards-2023/special-bac-resolution-2023",
                },
              ],
            },
            {
              name: "Full Disclosure Report",
              link: "/home/transparency-report/full-disclosure-report",
            },
            {
              name: "Parañaque Yearly Budget",
              link: "/home/transparency-report/paranaque-yearly-budget",
            },
            {
              name: "Schedule of Market Value",
              link: "/home/transparency-report/schedule-of-market-value",
            },
          ],
        },
        { name: "Contact Us", link: "/home/contact-us" },
      ],
    },
  ];

  const welcomeMessage = `Welcome to this Tree Test sample study!
This is a demonstration study to help you familiarize yourself with UsabiliTree's interface and functionality.

The activity should take about **5-10 minutes** to complete.

This sample is based on a real study conducted for the City Government of Parañaque website organization. Try navigating through the tree structure to find information as you would on a government website.`;

  const completionMessage = `# Great job!
You've completed the sample Tree Test study! 

This was a demonstration to help you understand how UsabiliTree works. You can now create your own studies and invite participants to help organize your website content.

Feel free to explore more features or start creating your own study.`;

  // Sample tasks from the original study
  const sampleTasks = [
    {
      description: "Where would you find the contact information for the Mayor's office?",
      expectedAnswer: "/home/government/city-officials, /home/contact-us",
    },
    {
      description: "Find information on applying for a business permit.",
      expectedAnswer: "/home/transactions-services/business-permits",
    },
    {
      description: "Where would you find how much you will pay for a traffic violation?",
      expectedAnswer: "/home/transactions-services/traffic-fines-violations",
    },
    {
      description: "Find information about tourist attractions available in the city.",
      expectedAnswer: "/home/tourism/tourist-sites-attractions",
    },
    {
      description: "Where do you find the mission and vision statement of the city government?",
      expectedAnswer: "/home/government/visionmission",
    },
    {
      description: "Check the city's annual budget information.",
      expectedAnswer: "/home/transparency-report/paranaque-yearly-budget",
    },
    {
      description: "Where would you find the requirements for health permits?",
      expectedAnswer: "/home/transactions-services/health-permits-services",
    },
    {
      description: "Find the list of City Departments.",
      expectedAnswer: "/home/government/city-departments",
    },
  ];

  const tasksToInsert = sampleTasks.map((task, index) => ({
    id: nanoid(),
    studyId: studyId,
    taskIndex: index,
    description: task.description,
    expectedAnswer: task.expectedAnswer,
  }));

  try {
    await db.transaction(
      async (tx) => {
        const [countRow] = await tx
          .select({ n: count() })
          .from(studies)
          .where(eq(studies.userId, userId));
        if (!canCreateStudy(countRow.n, studyLimit)) {
          throw new ForbiddenError("Study limit reached");
        }

        await tx.insert(studies).values({
          id: studyId,
          userId: userId,
          title: "Sample tree test",
          description: "Government website example",
          status: "active", // Make it active as requested
          type: "tree_test",
        });

        await tx.insert(treeConfigs).values({
          id: nanoid(),
          studyId: studyId,
          treeStructure: treeStructure,
          parsedTree: JSON.stringify(parsedTree),
          welcomeMessage: welcomeMessage,
          completionMessage: completionMessage,
        });

        if (tasksToInsert.length > 0) {
          await tx.insert(treeTasks).values(tasksToInsert);
        }

        for (const participant of sampleParticipants) {
          const { taskResults, ...participantData } = participant;

          const participantId = nanoid();

          await tx.insert(participants).values({
            id: participantId,
            studyId,
            sessionId: nanoid(),
            startedAt: participantData.startedAt,
            completedAt: participantData.completedAt,
            durationSeconds: participantData.durationSeconds,
          });

          const taskResultsWithIds = taskResults.map((result) => {
            const taskRow = tasksToInsert[result.taskIndex];
            if (!taskRow) {
              throw new Error(`Sample data: invalid taskIndex ${result.taskIndex}`);
            }
            return {
              id: nanoid(),
              studyId,
              participantId: participantId,
              taskId: taskRow.id,
              successful: result.successful,
              directPathTaken: result.directPathTaken,
              completionTimeSeconds: result.completionTimeSeconds,
              confidenceRating: result.confidenceRating,
              pathTaken: result.pathTaken,
              skipped: result.skipped,
            };
          });

          await tx.insert(treeTaskResults).values(taskResultsWithIds);
        }
      },
      { behavior: "immediate" }
    );

    revalidatePath("/dashboard");

    return { id: studyId };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    console.error("Failed to create sample study:", error);
    throw new Error("Failed to create sample study");
  }
}
