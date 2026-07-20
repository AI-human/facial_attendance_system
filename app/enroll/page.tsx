"use client";

import { useState } from "react";
import Link from "next/link";
import { CameraCapture, type CaptureResult } from "@/components/CameraCapture";
import { saveEnrollment } from "@/lib/api";
import { saveLocalEmbedding } from "@/lib/localEmbeddingCache";

export default function EnrollPage() {
  const [userId, setUserId] = useState("student-demo-001");
  const [status, setStatus] = useState("Hold face steady for 5 seconds to enroll");

  async function onCapture(result: CaptureResult) {
    const embedding = result.embedding;
    await saveLocalEmbedding(userId, embedding);
    try {
      await saveEnrollment({ userId, embedding, quality: result.quality });
      setStatus("Enrollment complete! 1 verified face sample saved.");
    } catch {
      setStatus("Enrollment cached locally on this device!");
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">face-edu</Link>
        <div className="navlinks">
          <Link href="/check-in/demo-session">Check in</Link>
        </div>
      </nav>
      <div className="panel" style={{ maxWidth: 960, margin: "0 auto 18px" }}>
        <h1 style={{ fontSize: 48 }}>Enroll face</h1>
        <p>Hold face steady for 5 seconds of anti-spoofing verification. 1 verified sample will be saved automatically.</p>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} aria-label="User ID" />
        <p style={{ marginTop: 10 }}><strong>{status}</strong></p>
      </div>
      <CameraCapture onCapture={onCapture} />
    </main>
  );
}
