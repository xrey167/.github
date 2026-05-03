import { render, screen, waitFor } from "@testing-library/react";
import { Toaster } from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BudgetCard from "./BudgetCard";

const getBudgetStatus = vi.fn();
const setBudget = vi.fn();
const clearBudget = vi.fn();

vi.mock("../../lib/tauri", () => ({
  tauriApi: {
    getBudgetStatus: (...args: unknown[]) => getBudgetStatus(...args),
    setBudget: (...args: unknown[]) => setBudget(...args),
    clearBudget: (...args: unknown[]) => clearBudget(...args),
  },
}));

beforeEach(() => {
  getBudgetStatus.mockReset();
  setBudget.mockReset();
  clearBudget.mockReset();
});

function renderCard() {
  return render(
    <>
      <BudgetCard />
      <Toaster />
    </>,
  );
}

describe("BudgetCard", () => {
  it("renders 'no budget set' when limit is null", async () => {
    getBudgetStatus.mockResolvedValue({
      period: "daily",
      limit_usd: null,
      alert_at_pct: null,
      spent_usd: 0.42,
      used_pct: null,
      state: "no_budget",
    });
    renderCard();
    expect(await screen.findByText(/No daily budget set/)).toBeTruthy();
  });

  it("renders the spent / limit ratio when a budget exists", async () => {
    getBudgetStatus.mockResolvedValue({
      period: "daily",
      limit_usd: 5,
      alert_at_pct: 80,
      spent_usd: 2.5,
      used_pct: 50,
      state: "ok",
    });
    renderCard();
    // Spent / limit summary line.
    await waitFor(() => {
      expect(screen.getByText(/\$2\.5000.*\$5\.0000/)).toBeTruthy();
    });
    expect(screen.getByText("ok")).toBeTruthy();
    expect(screen.getByText(/50%/)).toBeTruthy();
  });

  it("colors the alert state with amber", async () => {
    getBudgetStatus.mockResolvedValue({
      period: "daily",
      limit_usd: 5,
      alert_at_pct: 80,
      spent_usd: 4.2,
      used_pct: 84,
      state: "alert",
    });
    const { container } = renderCard();
    await waitFor(() => expect(screen.getByText("alert")).toBeTruthy());
    // The status banner is the only element with the amber colour class.
    expect(container.querySelector(".bg-amber-100")).not.toBeNull();
  });

  it("colors the exceeded state with red", async () => {
    getBudgetStatus.mockResolvedValue({
      period: "daily",
      limit_usd: 5,
      alert_at_pct: 80,
      spent_usd: 6,
      used_pct: 120,
      state: "exceeded",
    });
    const { container } = renderCard();
    await waitFor(() => expect(screen.getByText("exceeded")).toBeTruthy());
    expect(container.querySelector(".bg-red-100")).not.toBeNull();
  });

  it("renders the period switcher with Daily and Monthly", async () => {
    getBudgetStatus.mockResolvedValue({
      period: "daily",
      limit_usd: null,
      alert_at_pct: null,
      spent_usd: 0,
      used_pct: null,
      state: "no_budget",
    });
    renderCard();
    expect(screen.getByText("Daily")).toBeTruthy();
    expect(screen.getByText("Monthly")).toBeTruthy();
  });

  it("does not crash when the status fetch rejects", async () => {
    getBudgetStatus.mockRejectedValue(new Error("network"));
    renderCard();
    // Save / Limit input still renders even though no status came back.
    expect(screen.getByText(/Limit/)).toBeTruthy();
  });
});
