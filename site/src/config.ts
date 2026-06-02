export type ContactTab = "work_together" | "hiring" | "other";

export interface StatusState {
  text: string;
  kind: "" | "loading" | "error";
}

export interface ProgressState {
  visible: boolean;
  kind: "" | "loading" | "error";
  text: string;
  showFirstNote: boolean;
}

export interface SentState {
  lede: string;
  body: string;
}

export interface PreviewEmailResponse {
  subject?: string;
  body: string;
}

export interface SendEmailResponse {
  sent: boolean;
  message?: string;
}

const PRODUCTION_INTAKE_API_BASE = "https://personal-intake-api.onrender.com";

export const INTAKE_API_BASE = import.meta.env.VITE_INTAKE_API_BASE  ||
  document.querySelector<HTMLMetaElement>('meta[name="intake-api-base"]')?.content ||
  PRODUCTION_INTAKE_API_BASE;

export function isLocalIntakeApi(): boolean {
  try {
    const host = new URL(INTAKE_API_BASE).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

if (import.meta.env.DEV) {
  console.info("[contact] intake API:", INTAKE_API_BASE);
  if (!isLocalIntakeApi()) {
    console.warn(
      "[contact] dev is using a remote API. For local backend, create site/.env.local with VITE_INTAKE_API_BASE=http://127.0.0.1:8000 and restart Vite."
    );
  }
}

export const CONTACT_TABS: ReadonlyArray<{ id: ContactTab; label: string }> = [
  { id: "work_together", label: "Work together" },
  { id: "hiring", label: "Hiring" },
  { id: "other", label: "Other" },
];

export const PLACEHOLDERS: Record<ContactTab, string> = {
  work_together: "e.g. vision pipeline for production, or help scoping an ML build",
  hiring: "e.g. senior ML systems role, remote, timeline Q3",
  other: "e.g. question about a post, or a quick intro",
};

export function isContactTab(value: string): value is ContactTab {
  return value === "work_together" || value === "hiring" || value === "other";
}
