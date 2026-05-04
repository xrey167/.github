import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as projectStore from "../lib/project-store";
import type { Project } from "../lib/tauri";
import ProjectSwitcher from "./ProjectSwitcher";

// react-hot-toast renders into a portal at runtime; the toast calls don't
// affect what we assert on, but the import would otherwise pull in the
// real Toaster. Stub the two methods we touch.
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const projectA: Project = { id: 1, name: "Acme", target: "acme.com", created_at: null };
const projectB: Project = { id: 2, name: "Globex", target: "globex.io", created_at: null };

interface MockOverrides {
  projects?: Project[];
  active?: Project | null;
  createProject?: ReturnType<typeof vi.fn>;
  deleteProject?: ReturnType<typeof vi.fn>;
  setActive?: ReturnType<typeof vi.fn>;
}

function mockProject(o: MockOverrides = {}) {
  // Use `'key' in o` for `active` so callers can pass `active: null`
  // explicitly without it being coalesced back to the default.
  vi.spyOn(projectStore, "useProject").mockReturnValue({
    projects: o.projects ?? [projectA, projectB],
    active: "active" in o ? (o.active ?? null) : projectA,
    loading: false,
    reload: vi.fn(),
    setActive: o.setActive ?? vi.fn(),
    createProject: o.createProject ?? vi.fn().mockResolvedValue(3),
    renameProject: vi.fn(),
    deleteProject: o.deleteProject ?? vi.fn().mockResolvedValue(undefined),
  });
}

describe("ProjectSwitcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all projects in the dropdown and selects the active one", () => {
    mockProject();
    render(<ProjectSwitcher />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("1");
    expect(screen.getByRole("option", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Globex" })).toBeInTheDocument();
  });

  it("shows the active project's target underneath the dropdown", () => {
    mockProject();
    render(<ProjectSwitcher />);
    expect(screen.getByText("acme.com")).toBeInTheDocument();
  });

  it("shows a 'No projects yet' placeholder when the list is empty", () => {
    mockProject({ projects: [], active: null });
    render(<ProjectSwitcher />);
    expect(screen.getByRole("option", { name: /no projects yet/i })).toBeInTheDocument();
  });

  it("calls setActive with the parsed numeric id when the user picks a different project", () => {
    const setActive = vi.fn();
    mockProject({ setActive });
    render(<ProjectSwitcher />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    expect(setActive).toHaveBeenCalledWith(2);
  });

  it("opens the create form on '+' and disables Create until both fields have content", () => {
    mockProject();
    render(<ProjectSwitcher />);
    fireEvent.click(screen.getByTitle(/add project/i));
    const createBtn = screen.getByRole("button", { name: /^create$/i });
    expect(createBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/project name/i), {
      target: { value: "New Project" },
    });
    expect(createBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/target domain/i), {
      target: { value: "new.example" },
    });
    expect(createBtn).not.toBeDisabled();
  });

  it("calls createProject with the trimmed name and target on submit", async () => {
    const createProject = vi.fn().mockResolvedValue(7);
    mockProject({ createProject });
    render(<ProjectSwitcher />);
    fireEvent.click(screen.getByTitle(/add project/i));
    fireEvent.change(screen.getByPlaceholderText(/project name/i), {
      target: { value: "  Padded Name  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/target domain/i), {
      target: { value: "  trim.example  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    // Wait a microtask for the async handler to invoke the mock.
    await Promise.resolve();
    expect(createProject).toHaveBeenCalledWith("Padded Name", "trim.example");
  });

  it("does not call deleteProject if the user cancels the confirm dialog", () => {
    const deleteProject = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockProject({ deleteProject });
    render(<ProjectSwitcher />);
    fireEvent.click(screen.getByTitle(/delete project/i));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("calls deleteProject with the active id when confirmed", () => {
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockProject({ deleteProject, active: projectB });
    render(<ProjectSwitcher />);
    fireEvent.click(screen.getByTitle(/delete project/i));
    expect(deleteProject).toHaveBeenCalledWith(2);
  });

  it("hides the delete button when no project is active", () => {
    mockProject({ active: null });
    render(<ProjectSwitcher />);
    expect(screen.queryByTitle(/delete project/i)).toBeNull();
  });

  it("surfaces an error toast when createProject rejects", async () => {
    const toast = (await import("react-hot-toast")).default;
    const createProject = vi.fn().mockRejectedValue(new Error("backend down"));
    mockProject({ createProject });
    render(<ProjectSwitcher />);
    fireEvent.click(screen.getByTitle(/add project/i));
    fireEvent.change(screen.getByPlaceholderText(/project name/i), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByPlaceholderText(/target domain/i), {
      target: { value: "x.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    // Wait for the rejected promise to settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.error).toHaveBeenCalled();
  });
});
