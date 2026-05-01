const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatUsd(value: number): string {
  return usd.format(value);
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

export function formatCount(value: number): string {
  return compact.format(value);
}
