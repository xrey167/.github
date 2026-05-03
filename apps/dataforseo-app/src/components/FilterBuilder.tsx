import { useMemo } from "react";

import type { FilterLogical, FilterOperator, FilterTree } from "../lib/tauri";

/// Description of a filterable field — drives the field dropdown and the
/// value input's keyboard type. Frozen here for now (DataForSEO publishes
/// per-endpoint lists via /backlinks/available_filters; wiring that as the
/// runtime source is a future milestone).
export interface FieldMeta {
  /// Wire field name (sent verbatim to DataForSEO).
  name: string;
  /// Friendly label for the dropdown.
  label: string;
  /// Drives the value input's input type. "regex" only makes sense with
  /// the match / not_match operators; the UI doesn't gate on this — the
  /// user can pick any op against any field.
  type: "string" | "number" | "boolean" | "regex";
}

/// Built-in field catalog for the Backlinks Detail / Referring Domains
/// endpoints. Drives the visual filter builder when the runtime fetch
/// from `/backlinks/available_filters` isn't wired yet.
export const BACKLINKS_FIELDS: FieldMeta[] = [
  { name: "dofollow", label: "Dofollow", type: "boolean" },
  { name: "is_lost", label: "Lost link", type: "boolean" },
  { name: "is_broken", label: "Broken link", type: "boolean" },
  { name: "domain_from_rank", label: "Source domain rank", type: "number" },
  { name: "page_from_rank", label: "Source page rank", type: "number" },
  { name: "backlink_spam_score", label: "Spam score", type: "number" },
  { name: "anchor", label: "Anchor text", type: "string" },
  { name: "domain_from", label: "Source domain", type: "string" },
  { name: "url_from", label: "Source URL", type: "string" },
  { name: "url_to", label: "Target URL", type: "string" },
  { name: "tld_from", label: "Source TLD", type: "string" },
  { name: "item_type", label: "Link type", type: "string" },
  { name: "page_from_language", label: "Source language", type: "string" },
];

/// Op metadata: friendly label + how to render the value control.
const OPERATORS: { op: FilterOperator; label: string; control: ValueControl }[] =
  [
    { op: "eq", label: "=", control: "auto" },
    { op: "ne", label: "≠", control: "auto" },
    { op: "gt", label: ">", control: "number" },
    { op: "ge", label: "≥", control: "number" },
    { op: "lt", label: "<", control: "number" },
    { op: "le", label: "≤", control: "number" },
    { op: "like", label: "LIKE %x%", control: "string" },
    { op: "not_like", label: "NOT LIKE %x%", control: "string" },
    { op: "ilike", label: "ILIKE %x%", control: "string" },
    { op: "not_ilike", label: "NOT ILIKE %x%", control: "string" },
    { op: "in", label: "IN (a,b,c)", control: "csv" },
    { op: "not_in", label: "NOT IN (a,b,c)", control: "csv" },
    { op: "match", label: "REGEX", control: "string" },
    { op: "not_match", label: "NOT REGEX", control: "string" },
  ];

type ValueControl = "auto" | "string" | "number" | "csv";

interface Props {
  /// Current filter tree. `null` means "no filter" (runs unfiltered).
  value: FilterTree | null;
  /// Called with the next tree, or null when the user removes the last
  /// condition. The parent owns the state.
  onChange: (next: FilterTree | null) => void;
  /// Available fields for the field dropdown. Defaults to BACKLINKS_FIELDS.
  fields?: FieldMeta[];
  /// Disable every input + button while a request is in flight.
  disabled?: boolean;
}

/// Recursive AND/OR/regex filter builder. Renders an editable condition
/// grid with `+ AND` / `+ OR` / `+ Group` buttons; each row gets an `×`
/// to remove. The top-level value can be a single condition or a group;
/// removing the last child collapses back to `null`.
export default function FilterBuilder({
  value,
  onChange,
  fields = BACKLINKS_FIELDS,
  disabled = false,
}: Props) {
  // Wrap a bare condition in a group so the rendering pipeline always
  // walks a group node. Unwrap on the way out (see normalize below).
  const root: FilterTree = useMemo(
    () =>
      value == null
        ? { kind: "group", nodes: [], connectors: [] }
        : value.kind === "group"
          ? value
          : { kind: "group", nodes: [value], connectors: [] },
    [value],
  );

  function commit(next: FilterTree) {
    onChange(normalize(next));
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-700">Filter</span>
        {value != null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-xs text-slate-500 underline disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </div>
      <GroupNode
        node={root}
        path={[]}
        fields={fields}
        disabled={disabled}
        onChange={commit}
        depth={0}
      />
    </div>
  );
}

// ---------- Recursive renderers ----------

interface GroupNodeProps {
  node: Extract<FilterTree, { kind: "group" }>;
  path: number[];
  fields: FieldMeta[];
  disabled: boolean;
  onChange: (next: FilterTree) => void;
  depth: number;
}

function GroupNode({ node, fields, disabled, onChange, depth }: GroupNodeProps) {
  function updateNodes(nextNodes: FilterTree[], nextConnectors: FilterLogical[]) {
    onChange({ kind: "group", nodes: nextNodes, connectors: nextConnectors });
  }

  function addCondition(connector: FilterLogical = "and") {
    const newCond: FilterTree = {
      kind: "condition",
      field: fields[0]?.name ?? "anchor",
      operator: "eq",
      value: defaultValueFor(fields[0]?.type ?? "string"),
    };
    const nodes = [...node.nodes, newCond];
    const connectors =
      node.nodes.length === 0 ? [] : [...node.connectors, connector];
    updateNodes(nodes, connectors);
  }

  function addGroup(connector: FilterLogical = "and") {
    const empty: FilterTree = {
      kind: "group",
      nodes: [
        {
          kind: "condition",
          field: fields[0]?.name ?? "anchor",
          operator: "eq",
          value: defaultValueFor(fields[0]?.type ?? "string"),
        },
      ],
      connectors: [],
    };
    const nodes = [...node.nodes, empty];
    const connectors =
      node.nodes.length === 0 ? [] : [...node.connectors, connector];
    updateNodes(nodes, connectors);
  }

  function removeAt(idx: number) {
    const nodes = node.nodes.filter((_, i) => i !== idx);
    // Drop the connector between this child and its predecessor (or the
    // following one if removing the first child).
    const connectors = [...node.connectors];
    if (idx > 0) connectors.splice(idx - 1, 1);
    else if (connectors.length > 0) connectors.shift();
    updateNodes(nodes, connectors);
  }

  function setChild(idx: number, next: FilterTree) {
    const nodes = node.nodes.map((c, i) => (i === idx ? next : c));
    updateNodes(nodes, node.connectors);
  }

  function setConnector(idx: number, conn: FilterLogical) {
    const connectors = node.connectors.map((c, i) => (i === idx ? conn : c));
    updateNodes(node.nodes, connectors);
  }

  return (
    <div
      className={`flex flex-col gap-2 ${
        depth > 0 ? "rounded border border-slate-300 bg-white p-2" : ""
      }`}
    >
      {node.nodes.length === 0 ? (
        <p className="text-xs text-slate-500">
          No filters. Add a condition to narrow the results.
        </p>
      ) : (
        node.nodes.map((child, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            {idx > 0 && (
              <ConnectorSelect
                value={node.connectors[idx - 1] ?? "and"}
                disabled={disabled}
                onChange={(v) => setConnector(idx - 1, v)}
              />
            )}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {child.kind === "condition" ? (
                  <ConditionRow
                    node={child}
                    fields={fields}
                    disabled={disabled}
                    onChange={(next) => setChild(idx, next)}
                  />
                ) : (
                  <GroupNode
                    node={child}
                    path={[]}
                    fields={fields}
                    disabled={disabled}
                    onChange={(next) => setChild(idx, next)}
                    depth={depth + 1}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled}
                aria-label="Remove"
                className="mt-1 rounded px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>
          </div>
        ))
      )}
      <div className="flex flex-wrap gap-1 pt-1">
        <button
          type="button"
          onClick={() => addCondition("and")}
          disabled={disabled}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          + AND condition
        </button>
        <button
          type="button"
          onClick={() => addCondition("or")}
          disabled={disabled || node.nodes.length === 0}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          + OR condition
        </button>
        <button
          type="button"
          onClick={() => addGroup("and")}
          disabled={disabled}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          + Group
        </button>
      </div>
    </div>
  );
}

interface ConditionRowProps {
  node: Extract<FilterTree, { kind: "condition" }>;
  fields: FieldMeta[];
  disabled: boolean;
  onChange: (next: FilterTree) => void;
}

function ConditionRow({ node, fields, disabled, onChange }: ConditionRowProps) {
  const meta = fields.find((f) => f.name === node.field);
  const opMeta = OPERATORS.find((o) => o.op === node.operator) ?? OPERATORS[0];
  const control = resolveControl(opMeta.control, meta?.type ?? "string");

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
      <select
        value={node.field}
        onChange={(e) => {
          const nextField = e.target.value;
          const nextMeta = fields.find((f) => f.name === nextField);
          onChange({
            ...node,
            field: nextField,
            value: coerceValue(node.value, nextMeta?.type ?? "string"),
          });
        }}
        disabled={disabled}
        className="rounded border px-2 py-1 text-xs disabled:bg-slate-100"
      >
        {fields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        value={node.operator}
        onChange={(e) =>
          onChange({ ...node, operator: e.target.value as FilterOperator })
        }
        disabled={disabled}
        className="rounded border px-2 py-1 text-xs disabled:bg-slate-100"
      >
        {OPERATORS.map((o) => (
          <option key={o.op} value={o.op}>
            {o.label}
          </option>
        ))}
      </select>
      <ValueInput
        control={control}
        value={node.value}
        disabled={disabled}
        onChange={(v) => onChange({ ...node, value: v })}
      />
    </div>
  );
}

function ConnectorSelect({
  value,
  disabled,
  onChange,
}: {
  value: FilterLogical;
  disabled: boolean;
  onChange: (v: FilterLogical) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterLogical)}
      disabled={disabled}
      aria-label="Connector"
      className="self-start rounded border px-2 py-0.5 text-xs uppercase text-slate-600 disabled:bg-slate-100"
    >
      <option value="and">AND</option>
      <option value="or">OR</option>
    </select>
  );
}

function ValueInput({
  control,
  value,
  disabled,
  onChange,
}: {
  control: "string" | "number" | "boolean" | "csv";
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  switch (control) {
    case "boolean":
      return (
        <select
          value={value === true ? "true" : "false"}
          onChange={(e) => onChange(e.target.value === "true")}
          disabled={disabled}
          className="rounded border px-2 py-1 text-xs disabled:bg-slate-100"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            onChange(Number.isFinite(n) ? n : 0);
          }}
          disabled={disabled}
          className="rounded border px-2 py-1 text-xs disabled:bg-slate-100"
        />
      );
    case "csv":
      return (
        <input
          type="text"
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          disabled={disabled}
          placeholder="a, b, c"
          className="rounded border px-2 py-1 text-xs disabled:bg-slate-100"
        />
      );
    case "string":
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="rounded border px-2 py-1 font-mono text-xs disabled:bg-slate-100"
        />
      );
  }
}

// ---------- Helpers ----------

function defaultValueFor(type: FieldMeta["type"]): unknown {
  switch (type) {
    case "boolean":
      return true;
    case "number":
      return 0;
    case "string":
    case "regex":
    default:
      return "";
  }
}

/// When the user changes the field, coerce the existing value into the
/// new field's type so we don't send `dofollow = "abc"`.
function coerceValue(prev: unknown, type: FieldMeta["type"]): unknown {
  switch (type) {
    case "boolean":
      return prev === true || prev === "true";
    case "number": {
      const n = typeof prev === "number" ? prev : Number(prev);
      return Number.isFinite(n) ? n : 0;
    }
    case "string":
    case "regex":
    default:
      return typeof prev === "string" ? prev : String(prev ?? "");
  }
}

/// Some operators force a specific value control (number for >, csv for
/// in, etc.). Where the op is "auto", fall back to the field's declared
/// type.
function resolveControl(
  opControl: ValueControl,
  fieldType: FieldMeta["type"],
): "string" | "number" | "boolean" | "csv" {
  if (opControl !== "auto") return opControl;
  if (fieldType === "boolean") return "boolean";
  if (fieldType === "number") return "number";
  return "string";
}

/// Collapse trivial group shapes so the wire form stays clean:
/// - empty group → null (skip the filter param entirely)
/// - single-child group → unwrap to the child
export function normalize(tree: FilterTree | null): FilterTree | null {
  if (tree == null) return null;
  if (tree.kind === "condition") return tree;
  const cleaned: FilterTree = {
    kind: "group",
    nodes: tree.nodes.map((n) => normalize(n)).filter((n): n is FilterTree => n != null),
    connectors: tree.connectors.slice(0, Math.max(0, tree.nodes.length - 1)),
  };
  if (cleaned.kind === "group" && cleaned.nodes.length === 0) return null;
  if (cleaned.kind === "group" && cleaned.nodes.length === 1) return cleaned.nodes[0];
  return cleaned;
}
