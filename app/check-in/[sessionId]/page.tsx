"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CameraCapture, type CaptureResult } from "@/components/CameraCapture";
import { fetchEmbedding, markAttendance } from "@/lib/api";
import { cosineSimilarity } from "@/lib/faceEngine";
import { getLocalEmbedding, saveLocalEmbedding } from "@/lib/localEmbeddingCache";

export default function CheckInPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [userId, setUserId] = useState("student-demo-001");
  const [status, setStatus] = useState("Complete liveness to check in");

  async function onCapture(result: CaptureResult) {
    let reference = await getLocalEmbedding(userId);
    let source = "local cache";
    if (!reference) {
      try {
        reference = await fetchEmbedding(userId);
        source = "server sync";
        if (reference) await saveLocalEmbedding(userId, reference);
      } catch {
        // Continue to check local
      }
    }
    if (!reference) {
      setStatus("No enrollment found for this ID. Please enroll first.");
      return;
    }
    const similarity = cosineSimilarity(reference, result.embedding);
    if (similarity < 0.35) {
      setStatus(`Rejected. Similarity ${similarity.toFixed(3)} (Low match from ${source})`);
      return;
    }
    try {
      await markAttendance({ userId, sessionId, similarity, spoofScore: result.spoof.score });
      setStatus(`Checked in! Similarity ${similarity.toFixed(3)} (${source})`);
    } catch {
      setStatus(`Checked in locally! Similarity ${similarity.toFixed(3)} (${source})`);
    }
  }

  return (
    <main className="shell">
      <nav className="nav"><Link className="brand" href="/">face-edu</Link><div className="navlinks"><Link href="/enroll">Enroll</Link></div></nav>
      <div className="panel" style={{ maxWidth: 960, margin: "0 auto 18px" }}>
        <h1 style={{ fontSize: 48 }}>Check in</h1>
        <p>Session: <strong>{sessionId}</strong></p>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} aria-label="User ID" />
        <p><strong>{status}</strong></p>
      </div>
      <CameraCapture onCapture={onCapture} />
    </main>
  );
}
