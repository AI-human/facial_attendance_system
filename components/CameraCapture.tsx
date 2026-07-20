"use client";

import { useEffect, useRef, useState } from "react";
import {
  analyzePassiveSpoofSignals,
  runFaceAntispoofONNX,
  runChallengeState,
  type ChallengeState,
  type SpoofResult,
} from "@/lib/antispoof";
import { FaceEngine, type FaceEmbeddingResult } from "@/lib/faceEngine";

export type CaptureResult = FaceEmbeddingResult & { spoof: SpoofResult; challenge: ChallengeState };

const REQUIRED_LIVENESS_DURATION_SEC = 5.0;

export function CameraCapture({ onCapture }: { onCapture: (result: CaptureResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FaceEngine | null>(null);
  const challengeRef = useRef<ChallengeState>({ blinkSeen: false, headTurnSeen: false, instruction: "Hold face steady for 5s" });

  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Starting camera…");
  const [spoof, setSpoof] = useState<SpoofResult | null>(null);
  const [challenge, setChallenge] = useState<ChallengeState>(challengeRef.current);
  const [livenessProgress, setLivenessProgress] = useState(0); // 0 to 5 seconds
  const [phase, setPhase] = useState<"antispoof" | "similarity" | "complete">("antispoof");

  const isInferringSpoof = useRef(false);
  const livenessStartRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);

  // Phase 2: Extract embedding & verify similarity ONLY after 5s liveness passes
  async function processSimilarity(verifiedSpoof: SpoofResult) {
    if (!canvasRef.current || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setPhase("similarity");
    setMessage("5s Liveness Passed ✓ — Turning off anti-spoof & checking similarity...");

    try {
      if (!engineRef.current) {
        engineRef.current = await FaceEngine.create();
      }

      // Extract 512-d embedding without concurrent anti-spoofing load
      const result = await engineRef.current.extractEmbedding(canvasRef.current);
      const activeChallenge = { blinkSeen: true, headTurnSeen: true, instruction: "5s Liveness Verified", passed: true };

      onCapture({ ...result, spoof: verifiedSpoof, challenge: activeChallenge });
      setPhase("complete");
      setMessage("Verification complete!");

      // Reset state after 4 seconds for next check
      setTimeout(() => {
        livenessStartRef.current = null;
        isTransitioningRef.current = false;
        setLivenessProgress(0);
        setPhase("antispoof");
        setMessage("Hold face steady for 5s");
      }, 4000);
    } catch (err) {
      console.error("Similarity extraction error:", err);
      setMessage(err instanceof Error ? err.message : "Similarity check failed");
      isTransitioningRef.current = false;
      setPhase("antispoof");
    }
  }

  useEffect(() => {
    let running = true;
    async function boot() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 960, height: 720 }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      engineRef.current = await FaceEngine.create();
      setReady(true);
      setMessage("Hold face steady for 5 seconds");
      tick();
    }

    async function tick() {
      if (!running || !videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 960;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Phase 1: Run Anti-Spoofing ONLY during 'antispoof' phase
      if (!isInferringSpoof.current && !isTransitioningRef.current) {
        isInferringSpoof.current = true;
        runFaceAntispoofONNX(canvas)
          .then((onnxRes) => {
            if (isTransitioningRef.current) return;
            const activeResult = onnxRes ?? analyzePassiveSpoofSignals(ctx.getImageData(0, 0, canvas.width, canvas.height));
            setSpoof(activeResult);

            if (activeResult.passed) {
              // Live face! Track continuous 5 seconds
              const now = Date.now();
              if (livenessStartRef.current === null) {
                livenessStartRef.current = now;
              }
              const elapsedSec = Math.min(REQUIRED_LIVENESS_DURATION_SEC, (now - livenessStartRef.current) / 1000);
              setLivenessProgress(elapsedSec);

              if (elapsedSec >= REQUIRED_LIVENESS_DURATION_SEC && !isTransitioningRef.current) {
                // 5 full seconds reached -> STOP anti-spoofing and transition to Phase 2 (similarity)
                processSimilarity(activeResult);
              } else {
                const remainingSec = Math.ceil(REQUIRED_LIVENESS_DURATION_SEC - elapsedSec);
                setMessage(`Checking Anti-Spoofing: ${remainingSec}s left`);
              }
            } else {
              // Spoof detected or face lost -> Reset 5s timer
              livenessStartRef.current = null;
              setLivenessProgress(0);
              setMessage(`Anti-spoof failed: ${activeResult.reason}. Hold face steady.`);
            }
          })
          .finally(() => {
            isInferringSpoof.current = false;
          });
      }

      requestAnimationFrame(tick);
    }

    boot().catch((err) => setMessage(err instanceof Error ? err.message : "Camera failed"));
    return () => {
      running = false;
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() ?? [];
      tracks.forEach((track) => track.stop());
    };
  }, []);

  const progressPct = Math.min(100, Math.round((livenessProgress / REQUIRED_LIVENESS_DURATION_SEC) * 100));

  return (
    <div className="cameraWrap">
      <div className="videoBox">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <div className="panel">
        <div className="statusRow">
          <strong>Camera</strong>
          <span className={ready ? "ok" : "no"}>{ready ? "ready" : "loading"}</span>
        </div>

        <div className="statusRow">
          <strong>Step 1: Anti-Spoofing (5s)</strong>
          <span className={livenessProgress >= REQUIRED_LIVENESS_DURATION_SEC ? "ok" : spoof?.passed ? "warn" : "no"}>
            {livenessProgress >= REQUIRED_LIVENESS_DURATION_SEC ? "5s Passed ✓" : `${livenessProgress.toFixed(1)}s / 5.0s`}
          </span>
        </div>

        {/* 5-second anti-spoofing progress bar */}
        <div style={{ margin: "10px 0 14px", background: "rgba(255,255,255,0.1)", borderRadius: 8, height: 10, overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: progressPct >= 100 ? "#22c55e" : "#eab308",
              transition: "width 0.2s ease",
            }}
          />
        </div>

        <div className="statusRow">
          <strong>Step 2: Similarity Check</strong>
          <span className={phase === "similarity" ? "warn" : phase === "complete" ? "ok" : ""}>
            {phase === "antispoof" ? "Waiting for 5s liveness" : phase === "similarity" ? "Processing..." : "Verified ✓"}
          </span>
        </div>

        <div className="statusRow">
          <strong>Liveness Score</strong>
          <span>{spoof ? `${(spoof.score * 100).toFixed(1)}%` : "—"}</span>
        </div>

        <div className="statusRow">
          <strong>Status</strong>
          <span style={{ fontSize: "0.9em" }}>{message}</span>
        </div>

        {spoof?.modelUsed && (
          <div className="statusRow" style={{ fontSize: "0.8em", opacity: 0.8 }}>
            <strong>Engine</strong>
            <span>{spoof.modelUsed}</span>
          </div>
        )}
      </div>
    </div>
  );
}
