import Link from "next/link";
import { ShieldCheck, ScanFace, Database } from "lucide-react";

export default function HomePage() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">FaceRoll V2</div>
        <div className="navlinks">
          <Link href="/enroll">Enroll</Link>
          <Link href="/check-in/demo-session">Check in</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <span className="badge">On-device ML • Vercel database</span>
          <h1>Private facial attendance for mobile first classrooms.</h1>
          <p>
            Detection, anti-spoofing, and identity verification run on the student phone.
            The server only stores encrypted attendance records and the enrolled 512-d embedding.
          </p>
          <div className="actions">
            <Link className="button primary" href="/enroll">Start enrollment</Link>
            <Link className="button" href="/check-in/demo-session">Try check-in</Link>
          </div>
        </div>

      </section>
      <section className="grid">
        <article className="card"><ScanFace /><h3>On-device compute</h3><p>No face image needs to leave the phone during verify.</p></article>
        <article className="card"><ShieldCheck /><h3>Liveness gate</h3><p>Texture, sharpness, blink, head-turn, and optional MiniFASNet scoring.</p></article>
        <article className="card"><Database /><h3>Server sync</h3><p>First enrollment saves embedding. Later sessions fetch once and cache locally.</p></article>
      </section>
    </main>
  );
}
