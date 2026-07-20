"use client";

import { useState } from "react";
import Link from "next/link";
import { CameraCapture, type CaptureResult } from "@/components/CameraCapture";
import { saveEnrollment } from "@/lib/api";
import { saveLocalEmbedding } from "@/lib/localEmbeddingCache";

export default function EnrollPage() {
  const [userId, setUserId] = useState("student-demo-001");
  const [samples, setSamples] = useState<number[][]>([]);
  const [status, setStatus] = useState("Capture 3 live samples");

  async function onCapture(result: CaptureResult) {
    const next = [...samples, result.embedding];
    setSamples(next);
    if (next.length < 3) {
      setStatus(`Sample ${next.length}/3 saved`);
      return;
    }
    const mean = next[0].map((_, i) => next.reduce((sum, emb) => sum + emb[i], 0) / next.length);
    await saveLocalEmbedding(userId, mean);
    try {
      await saveEnrollment({ userId, embedding: mean, quality: result.quality });
      setStatus("Enrollment saved to database and cached on device!");
    } catch {
      setStatus("Enrollment cached locally on this device!");
    }
  }

  return (
    <main className="shell">
      <nav className="nav"><Link className="brand" href="/">FaceRoll V2</Link><div className="navlinks"><Link href="/check-in/demo-session">Check in</Link></div></nav>
      <div className="panel" style={{ maxWidth: 960, margin: "0 auto 18px" }}>
        <h1 style={{ fontSize: 48 }}>Enroll face</h1>
        <p>First enrollment saves the 512-d ArcFace embedding on the server, then caches it on this device for future check-ins.</p>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} aria-label="User ID" />
        <p><strong>{status}</strong></p>
      </div>
      <CameraCapture onCapture={onCapture} />
    </main>
  );
}
