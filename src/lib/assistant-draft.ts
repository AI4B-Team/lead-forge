// Draft persistence for the assistant (§22): conversation + spec survive a
// navigation away, but only for the active workspace, and only until the
// operator runs the job or starts over.
import { EMPTY_SPEC, jobSpecSchema, type JobSpec } from "@/lib/assistant.shared";

export type ThreadItem = {
  role: "user" | "assistant" | "system";
  content: string;
  /** Spec snapshot for assistant turns, so the thread card can show the trail. */
  spec?: JobSpec;
};

export type AssistantDraft = { thread: ThreadItem[]; spec: JobSpec; firstPrompt: string };

const key = (workspaceId: string) => `leadtrace_assistant_draft:${workspaceId}`;

export function saveDraft(workspaceId: string, draft: AssistantDraft) {
  try {
    sessionStorage.setItem(key(workspaceId), JSON.stringify(draft));
  } catch { /* ignore */ }
}

export function clearDraft(workspaceId: string) {
  try { sessionStorage.removeItem(key(workspaceId)); } catch { /* ignore */ }
}

export function loadDraft(workspaceId: string): AssistantDraft | null {
  try {
    const raw = sessionStorage.getItem(key(workspaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssistantDraft>;
    if (!Array.isArray(parsed.thread) || !parsed.thread.length) return null;
    return {
      thread: parsed.thread.filter((m) => m && typeof m.content === "string"),
      spec: parsed.spec ? jobSpecSchema.parse(parsed.spec) : EMPTY_SPEC,
      firstPrompt: typeof parsed.firstPrompt === "string" ? parsed.firstPrompt : "",
    };
  } catch {
    return null;
  }
}
