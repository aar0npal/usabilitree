export const APP_TITLE = "UsabiliTree";
export const EMAIL_SENDER = '"UsabiliTree" <noreply@usabilitree.com>'; // for nodemailer
export const CODE_LENGTH = 8;

/** `@creem_io/nextjs` links here; handlers live in `app/api/checkout` and `app/api/portal`. */
export const CREEM_API = {
  checkout: "/api/checkout",
  portal: "/api/portal",
} as const;

export enum Paths {
  Home = "/",
  Login = "/login",
  Signup = "/signup",
  Billing = "/dashboard/billing",
  Dashboard = "/dashboard",
  VerifyEmail = "/verify-email",
  ResetPassword = "/reset-password",
}

export const DASHBOARD_TOUR_STEP_IDS = {
  SAMPLE_STUDY: "sample-study",
  UPDATES: "updates",
  FEEDBACK: "feedback",
  SUPPORT: "support",
  ROADMAP: "roadmap",
} as const;

export const RESULTS_TOUR_STEP_IDS = {
  OVERVIEW: "overview",
  PARTICIPANTS: "participants",
  TASKS: "tasks",
  TASKS_EXPAND: "tasks-expand",
  SHARING: "sharing",
  SHARING_QUICK_ACTION: "sharing-quick-action",
  EXPORT: "export",
  EDIT: "edit",
} as const;

export const SETUP_TOUR_STEP_IDS = {
  GENERAL: "general",
  TREE: "tree",
  TASKS: "tasks",
  MESSAGES: "messages",
  SAVE: "save",
  PREVIEW: "preview",
  RESULTS: "results",
  DELETE: "delete",
} as const;
