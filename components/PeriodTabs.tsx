import Link from "next/link";
import { periods, type Period } from "@/lib/stats/periods";

// Row of links like "7 days · 30 days · 12 months · All time".
export default function PeriodTabs({ basePath, current }: { basePath: string; current: Period }) {
  return (
    <nav className="tabs">
      {periods.map((p) => (
        <Link key={p.value} href={`${basePath}?period=${p.value}`} className={p.value === current ? "tab active" : "tab"}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
