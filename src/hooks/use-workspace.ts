import { useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceOption = { id: string; name: string };

const STORAGE_KEY = "leadtrace.workspace_id";

// Single shared store so every useWorkspaceId() call site sees the same
// selection and re-renders together when the user switches workspaces.
let workspaces: WorkspaceOption[] = [];
let selectedId: string | null = null;
let loading = true;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function snapshot() {
  return `${selectedId ?? ""}|${loading ? 1 : 0}|${workspaces.map((w) => w.id + w.name).join(",")}`;
}

async function load() {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name)")
    .order("created_at", { ascending: true });

  workspaces = ((data ?? []) as Array<{ workspace_id: string; workspaces?: { name?: string } | null }>)
    .map((row) => ({ id: row.workspace_id, name: row.workspaces?.name ?? "Workspace" }));

  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  selectedId = workspaces.some((w) => w.id === stored) ? stored : (workspaces[0]?.id ?? null);
  loading = false;
  emit();
}

export function refreshWorkspaces() {
  loadPromise = load();
  return loadPromise;
}

export function switchWorkspace(id: string) {
  if (id === selectedId) return;
  selectedId = id;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  emit();
}

export async function renameWorkspace(id: string, name: string) {
  const { error } = await supabase.from("workspaces").update({ name }).eq("id", id);
  if (error) throw error;
  await refreshWorkspaces();
}

export async function deleteWorkspace(id: string) {
  const remaining = workspaces.filter((w) => w.id !== id);
  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) throw error;
  const next = remaining[0]?.id ?? null;
  if (selectedId === id) {
    selectedId = next;
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  await refreshWorkspaces();
  return next;
}

/** Current user's role in the active workspace — gates rename/delete affordances. */
export function useWorkspaceRole() {
  const { workspaceId } = useWorkspaceId();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) {
      setRole(null);
      return;
    }
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setRole((data?.role as string | undefined) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return {
    role,
    canRename: role === "owner" || role === "admin",
    canDelete: role === "owner",
  };
}

export function useWorkspaceId() {
  useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (!loadPromise) loadPromise = load();
  }, []);

  const current = workspaces.find((w) => w.id === selectedId) ?? null;

  return {
    workspaceId: selectedId,
    workspaceName: current?.name ?? null,
    workspaces,
    switchWorkspace,
    loading,
  };
}

export function useCreateWorkspace() {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (name: string) => {
    setCreating(true);
    try {
      const { createWorkspace } = await import("@/lib/workspace-create.functions");
      const { workspaceId } = await createWorkspace({ data: { name } });
      await refreshWorkspaces();
      switchWorkspace(workspaceId);
      return workspaceId;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
}
