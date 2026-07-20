import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="shell">
      <nav className="nav"><Link className="brand" href="/">FaceRoll V2</Link><div className="navlinks"><Link href="/enroll">Enroll</Link><Link href="/check-in/demo-session">Check in</Link></div></nav>
      <section className="panel" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 48 }}>Instructor dashboard</h1>
        <p>This starter includes the database schema and API endpoints. Wire your auth provider, then list courses, sessions, and attendance rows from the Vercel Postgres tables.</p>
      </section>
    </main>
  );
}
