import { useState } from "react";
import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import { useProject } from "../lib/project-store";

export default function ProjectSwitcher() {
  const { projects, active, setActive, createProject, deleteProject } = useProject();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");

  async function onCreate() {
    if (!newName.trim() || !newTarget.trim()) return;
    try {
      await createProject(newName.trim(), newTarget.trim());
      setNewName("");
      setNewTarget("");
      setAdding(false);
      toast.success(`Project "${newName.trim()}" created`);
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  async function onDelete() {
    if (!active) return;
    if (!window.confirm(`Delete project "${active.name}"? Tracked keywords + audits will be unlinked, not deleted.`)) return;
    try {
      await deleteProject(active.id);
      toast.success("Project deleted");
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase text-slate-500">Project</label>
      <div className="flex gap-1">
        <select
          value={active?.id ?? ""}
          onChange={(e) => setActive(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
          title="Add project"
        >
          +
        </button>
        {active && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            title="Delete project"
          >
            ✕
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-1 flex flex-col gap-1 rounded border border-slate-200 bg-slate-50 p-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            autoComplete="off"
          />
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Target domain"
            className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={!newName.trim() || !newTarget.trim()}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}
      {active && (
        <p
          className="truncate text-[11px] text-slate-500"
          title={active.target}
        >
          target: <span className="font-mono">{active.target}</span>
        </p>
      )}
    </div>
  );
}
