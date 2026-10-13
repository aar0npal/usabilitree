import type { TreeNode } from "@/lib/types/tree-test";

// Sample participant data extracted from the PARANAQUE Govt (Final) study
export const sampleParticipants = [
  {
    startedAt: new Date("2025-08-30T10:00:00Z"),
    completedAt: new Date("2025-08-30T10:07:20Z"),
    durationSeconds: 440,
    taskResults: [
      {
        taskIndex: 0,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 4.651,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 1,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 9.517,
        confidenceRating: 5,
        pathTaken: "/home/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 2,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.031,
        confidenceRating: 6,
        pathTaken: "/home/transactions-services/traffic-fines-violations",
        skipped: false,
      },
      {
        taskIndex: 3,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 5.509,
        confidenceRating: 7,
        pathTaken: "/home/tourism/top-establishments",
        skipped: false,
      },
      {
        taskIndex: 4,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 4.651,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 5,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 7.788,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/paranaque-yearly-budget",
        skipped: false,
      },
      {
        taskIndex: 6,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.633,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/health-permits-services",
        skipped: false,
      },
      {
        taskIndex: 7,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 4.401,
        confidenceRating: 7,
        pathTaken: "/home/government/city-departments",
        skipped: false,
      },
    ],
  },
  {
    startedAt: new Date("2025-08-30T11:30:00Z"),
    completedAt: new Date("2025-08-30T11:35:15Z"),
    durationSeconds: 315,
    taskResults: [
      {
        taskIndex: 0,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 5.903,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 1,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.976,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 2,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 8.14,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/traffic-fines-violations",
        skipped: false,
      },
      {
        taskIndex: 3,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 10.429,
        confidenceRating: 6,
        pathTaken: "/home/transparency-report/tourism/top-establishments",
        skipped: false,
      },
      {
        taskIndex: 4,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 5.903,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 5,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 8.915,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/paranaque-yearly-budget",
        skipped: false,
      },
      {
        taskIndex: 6,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 16.254,
        confidenceRating: 5,
        pathTaken: "/home/transactions-services/health-permits-services",
        skipped: false,
      },
      {
        taskIndex: 7,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 5.455,
        confidenceRating: 7,
        pathTaken: "/home/government/city-departments",
        skipped: false,
      },
    ],
  },
  {
    startedAt: new Date("2025-08-30T14:15:00Z"),
    completedAt: new Date("2025-08-30T14:20:45Z"),
    durationSeconds: 345,
    taskResults: [
      {
        taskIndex: 0,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 7.317,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 1,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.252,
        confidenceRating: 6,
        pathTaken: "/home/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 2,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.031,
        confidenceRating: 6,
        pathTaken: "/home/transactions-services/traffic-fines-violations",
        skipped: false,
      },
      {
        taskIndex: 3,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 5.599,
        confidenceRating: 6,
        pathTaken: "/home/tourism/top-establishments",
        skipped: false,
      },
      {
        taskIndex: 4,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 7.317,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 5,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 8.618,
        confidenceRating: 5,
        pathTaken: "/home/transparency-report/paranaque-yearly-budget",
        skipped: false,
      },
      {
        taskIndex: 6,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 12.5,
        confidenceRating: 4,
        pathTaken: "/home/transactions-services/health-permits-services",
        skipped: false,
      },
      {
        taskIndex: 7,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 6.087,
        confidenceRating: 5,
        pathTaken: "/home/government/city-departments",
        skipped: false,
      },
    ],
  },
  {
    startedAt: new Date("2025-08-30T16:45:00Z"),
    completedAt: new Date("2025-08-30T16:52:30Z"),
    durationSeconds: 450,
    taskResults: [
      {
        taskIndex: 0,
        successful: false,
        directPathTaken: false,
        completionTimeSeconds: 22.327,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/transactions-services/government/paranaque-profile",
        skipped: false,
      },
      {
        taskIndex: 1,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 11.986,
        confidenceRating: 7,
        pathTaken: "/home/government/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 2,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 25.926,
        confidenceRating: 7,
        pathTaken:
          "/home/transactions-services/tourism/transparency-report/transactions-services/traffic-fines-violations",
        skipped: false,
      },
      {
        taskIndex: 3,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 18.247,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/bids-and-awards-2023/tourism/top-establishments",
        skipped: false,
      },
      {
        taskIndex: 4,
        successful: false,
        directPathTaken: false,
        completionTimeSeconds: 22.327,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/transactions-services/government/paranaque-profile",
        skipped: false,
      },
      {
        taskIndex: 5,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 11.781,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/paranaque-yearly-budget",
        skipped: false,
      },
      {
        taskIndex: 6,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 16.335,
        confidenceRating: 4,
        pathTaken: "/home/government/transactions-services/health-permits-services",
        skipped: false,
      },
      {
        taskIndex: 7,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 7.213,
        confidenceRating: 4,
        pathTaken: "/home/tourism/government/city-departments",
        skipped: false,
      },
    ],
  },
  {
    startedAt: new Date("2025-08-01T09:20:00Z"),
    completedAt: new Date("2025-08-01T09:25:30Z"),
    durationSeconds: 330,
    taskResults: [
      {
        taskIndex: 0,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 8.753,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 1,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 9.383,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 2,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 15.716,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/traffic-fines-violations",
        skipped: false,
      },
      {
        taskIndex: 3,
        successful: false,
        directPathTaken: false,
        completionTimeSeconds: 31.317,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/transactions-services/business-permits",
        skipped: false,
      },
      {
        taskIndex: 4,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 8.753,
        confidenceRating: 7,
        pathTaken: "/home/government/visionmission",
        skipped: false,
      },
      {
        taskIndex: 5,
        successful: false,
        directPathTaken: true,
        completionTimeSeconds: 15.201,
        confidenceRating: 7,
        pathTaken: "/home/transparency-report/full-disclosure-report",
        skipped: false,
      },
      {
        taskIndex: 6,
        successful: true,
        directPathTaken: true,
        completionTimeSeconds: 12.168,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/health-permits-services",
        skipped: false,
      },
      {
        taskIndex: 7,
        successful: true,
        directPathTaken: false,
        completionTimeSeconds: 10.351,
        confidenceRating: 7,
        pathTaken: "/home/transactions-services/government/city-departments",
        skipped: false,
      },
    ],
  },
];

// The sample tree from the PARANAQUE Govt study: its comma text, and the tree
// saved from it (each leaf linked by its path)
export const sampleTreeStructure = `Home
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

export const sampleParsedTree: TreeNode[] = [
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
                name: "City Treasurer’s Office — Online Payment Portal",
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
