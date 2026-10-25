// A numbered chart: 1. Name (artist) ........ 42 plays
export type RankedItem = { key: string; name: string; detail?: string; plays: number; href?: string };

export default function RankedList({ items, empty }: { items: RankedItem[]; empty: string }) {
  if (items.length === 0) return <p className="empty">{empty}</p>;

  return (
    <ol className="ranked">
      {items.map((item, i) => (
        <li key={item.key}>
          <span className="rank">{i + 1}</span>
          <span className="name">
            {item.href ? <a href={item.href}>{item.name}</a> : item.name}
            {item.detail && <small>{item.detail}</small>}
          </span>
          <span className="plays">
            {item.plays.toLocaleString("en-GB")} {item.plays === 1 ? "play" : "plays"}
          </span>
        </li>
      ))}
    </ol>
  );
}
