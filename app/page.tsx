import Link from "next/link";
import Image from "next/image";

const features = [
  { title: "Now playing", text: "Show what you're listening to with a card that includes your play count." },
  { title: "Recent plays", text: "Your last five tracks on one clean card." },
  { title: "Top charts", text: "Your top artists, tracks and albums for the week, month, year or all time." },
  { title: "Who knows", text: "See who in your community listens to an artist the most, and who holds the crown." },
  { title: "Leaderboards", text: "Weekly, monthly and all-time charts for your whole Root community." },
  { title: "Your history", text: "Bring your old listening history with you from a Spotify or ListenBrainz export." },
];

const steps = [
  { title: "Sign in", text: "Make a static. account with your email. There's no password to remember." },
  { title: "Connect your music", text: "Point a scrobbler app at static., or upload your listening history." },
  {
    title: "Link Root",
    text: (
      <>
        Type <code>/st link</code> in Root and enter the code on this site.
      </>
    ),
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Music stats for Root</p>
        <h1>your music, on record.</h1>
        <p className="lead">
          static. keeps track of everything you listen to and turns it into cards and charts for your Root community.
        </p>
        <div className="actions">
          <Link href="/login" className="button">
            Get started
          </Link>
          <button className="button ghost" disabled>
            Add to Root
          </button>
        </div>
        <p className="note">Adding static. to Root is coming soon.</p>
      </section>

      <section className="section">
        <h2>Cards</h2>
        <div className="cards">
          <Image src="/previews/now-playing.png" alt="Now Playing card" width={1370} height={490} priority />
          <Image src="/previews/recent.png" alt="Recent plays card" width={1370} height={633} />
        </div>
      </section>

      <section className="section">
        <h2>What it does</h2>
        <div className="grid">
          {features.map((f) => (
            <div className="panel" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="grid">
          {steps.map((s, i) => (
            <div className="panel" key={s.title}>
              <span className="step-number">STEP {i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
