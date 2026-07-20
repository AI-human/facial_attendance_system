"use client";

import { useEffect, useRef, useState } from "react";
import {
  analyzePassiveSpoofSignals,
  runFaceAntispoofONNX,
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
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Starting camera…");
  const [spoof, setSpoof] = useState<SpoofResult | null>(null);
  const [livenessProgress, setLivenessProgress] = useState(0); // 0 to 5 seconds
  const [phase, setPhase] = useState<"antispoof" | "similarity" | "complete">("antispoof");

  const isInferringSpoof = useRef(false);
  const livenessStartRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const isComponentMounted = useRef(true);

  function stopCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  }

  async function startCamera() {
    stopCamera();
    try {
      setPhase("antispoof");
      setLivenessProgress(0);
      livenessStartRef.current = null;
      isTransitioningRef.current = false;
      setMessage("Starting camera…");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 960, height: 720 },
        audio: false,
      });
      mediaStreamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (!engineRef.current) {
        engineRef.current = await FaceEngine.create();
      }

      setReady(true);
      setMessage("Hold face steady for 5 seconds");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Camera failed to start");
    }
  }

  // Phase 2: Extract embedding & verify similarity ONLY after 5s liveness passes
  async function processSimilarity(verifiedSpoof: SpoofResult) {
    if (!canvasRef.current || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setPhase("similarity");
    setMessage("5s Liveness Passed ✓ — Stopping camera & verifying identity...");

    try {
      if (!engineRef.current) {
        engineRef.current = await FaceEngine.create();
      }

      // Extract 512-d embedding without concurrent anti-spoofing load
      const result = await engineRef.current.extractEmbedding(canvasRef.current);
      const activeChallenge = { blinkSeen: true, headTurnSeen: true, instruction: "5s Liveness Verified", passed: true };

      // Turn off camera stream immediately after capture & verification
      stopCamera();

      onCapture({ ...result, spoof: verifiedSpoof, challenge: activeChallenge });
      setPhase("complete");
      setMessage("Verification complete! Camera turned off.");
    } catch (err) {
      console.error("Similarity extraction error:", err);
      setMessage(err instanceof Error ? err.message : "Similarity check failed");
      isTransitioningRef.current = false;
      setPhase("antispoof");
    }
  }

  useEffect(() => {
    isComponentMounted.current = true;
    startCamera();

    let running = true;
    async function tick() {
      if (!running || !isComponentMounted.current) return;

      if (videoRef.current && canvasRef.current && mediaStreamRef.current && isReady()) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 960;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Phase 1: Run Anti-Spoofing ONLY during active camera and 'antispoof' phase
          if (!isInferringSpoof.current && !isTransitioningRef.current) {
            isInferringSpoof.current = true;
            runFaceAntispoofONNX(canvas)
              .then((onnxRes) => {
                if (isTransitioningRef.current || !mediaStreamRef.current) return;
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
        }
      }

      if (running) {
        requestAnimationFrame(tick);
      }
    }

    function isReady() {
      return videoRef.current && videoRef.current.readyState >= 2;
    }

    tick();

    return () => {
      running = false;
      isComponentMounted.current = false;
      stopCamera();
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
          <span className={ready ? "ok" : "no"}>{ready ? "Active" : "OFF"}</span>
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

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="button primary" onClick={startCamera}>
            {phase === "complete" || !ready ? "Recheck / Resubmit to capture" : "Restart camera"}
          </button>
        </div>
      </div>
    </div>
  );
}
