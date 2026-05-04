import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as projectStore from "../lib/project-store";
import * as tauri from "../lib/tauri";
import type { Project } from "../lib/tauri";
import QuickActions from "./QuickActions";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const project: Project = {
  id: 1,
  name: "Acme",
  target: "acme.com",
  created_at: null,
};

function mockProject(active: Project | null = project) {
  vi.spyOn(projectStore, "useProject").mockReturnValue({
    projects: active ? [active] : [],
    active,
    loading: false,
    reload: vi.fn(),
    setActive: vi.fn(),
    createProject: vi.fn(),
    renameProject: vi.fn(),
    deleteProject: vi.fn(),
  });
}

describe("QuickActions", () => {
  beforeEach(() => {
    mockProject();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the three labelled action buttons in default mode", () => {
    render(<QuickActions />);
    expect(screen.getByRole("button", { name: /track/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /audit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /brand/i })).toBeInTheDocument();
  });

  it("renders icon-only buttons in compact mode", () => {
    render(<QuickActions compact />);
    // In compact mode, the visible text is just the emoji.
    expect(screen.getByRole("button", { name: "📊" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🔍" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🏢" })).toBeInTheDocument();
  });

  it("opens the Track modal pre-filled with project target + supplied keyword", () => {
    render(<QuickActions keyword="seo tools" />);
    fireEvent.click(screen.getByRole("button", { name: /track/i }));
    expect(screen.getByText(/track keyword/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("acme.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("seo tools")).toBeInTheDocument();
  });

  it("calls trackingAdd with trimmed values when Track is submitted", async () => {
    const trackingAdd = vi.spyOn(tauri.tauriApi, "trackingAdd").mockResolvedValue(7);
    render(<QuickActions keyword="seo tools" />);
    fireEvent.click(screen.getByRole("button", { name: /track/i }));
    fireEvent.click(screen.getByRole("button", { name: /^track$/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(trackingAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "acme.com",
        keyword: "seo tools",
        frequency: "daily",
      }),
    );
  });

  it("opens the Audit modal pre-filled with the URL prop when supplied", () => {
    render(<QuickActions url="https://example.com/page" />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByText(/site audit/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/page")).toBeInTheDocument();
  });

  it("falls back to the project target with https:// prefix when no url prop is given", () => {
    render(<QuickActions />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByDisplayValue("https://acme.com")).toBeInTheDocument();
  });

  it("does NOT double-prefix a project target that already starts with https://", () => {
    mockProject({
      ...project,
      target: "https://already.example",
    });
    render(<QuickActions />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    expect(screen.getByDisplayValue("https://already.example")).toBeInTheDocument();
  });

  it("calls auditStart with the URL and selected page count", async () => {
    const auditStart = vi.spyOn(tauri.tauriApi, "auditStart").mockResolvedValue(42);
    render(<QuickActions url="https://example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /audit/i }));
    fireEvent.click(screen.getByRole("button", { name: /start audit/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(auditStart).toHaveBeenCalledWith({
      target: "https://example.com",
      maxCrawlPages: 100,
    });
  });

  it("opens the Brand modal pre-filled with the supplied keyword and submits brandSearch", async () => {
    const brandSearch = vi.spyOn(tauri.tauriApi, "brandSearch").mockResolvedValue({
      items_count: 17,
      from_cache: false,
    } as Awaited<ReturnType<typeof tauri.tauriApi.brandSearch>>);
    render(<QuickActions keyword="my brand" />);
    fireEvent.click(screen.getByRole("button", { name: /brand/i }));
    expect(screen.getByDisplayValue("my brand")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /search mentions/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(brandSearch).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: "my brand", limit: 50, useCache: true }),
    );
  });

  it("closes the modal when the Cancel button is clicked", () => {
    render(<QuickActions keyword="x" />);
    fireEvent.click(screen.getByRole("button", { name: /track/i }));
    expect(screen.getByText(/track keyword/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/track keyword/i)).toBeNull();
  });

  it("surfaces an error toast when the underlying tauriApi call rejects", async () => {
    const toast = (await import("react-hot-toast")).default;
    vi.spyOn(tauri.tauriApi, "trackingAdd").mockRejectedValue(new Error("offline"));
    render(<QuickActions keyword="seo" />);
    fireEvent.click(screen.getByRole("button", { name: /track/i }));
    fireEvent.click(screen.getByRole("button", { name: /^track$/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.error).toHaveBeenCalled();
  });
});
