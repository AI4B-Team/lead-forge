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
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { data: ws, error } = await supabase
        .from("workspaces")
        .insert({ name })
        .select("id")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
      if (memberError) throw memberError;
      await refreshWorkspaces();
      switchWorkspace(ws.id);
      return ws.id;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
}
