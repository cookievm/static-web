// The time ranges the profile and leaderboard pages can show.
export const periods = [
  { value: "7day", label: "7 days", days: 7 },
  { value: "1month", label: "30 days", days: 30 },
  { value: "12month", label: "12 months", days: 365 },
  { value: "overall", label: "All time", days: null },
] as const;

export type Period = (typeof periods)[number]["value"];

export function pickPeriod(value: string | undefined): Period {
  return periods.some((p) => p.value === value) ? (value as Period) : "1month";
}

// First day to count from (null = all time). Matches periodStart in lib/api/bot.ts.
export function sinceDate(period: Period) {
  const days = periods.find((p) => p.value === period)?.days;
  if (!days) return null;
  return new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { dateStyle: "medium" });
}
