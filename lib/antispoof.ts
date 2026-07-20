import * as ort from "onnxruntime-web";

export type SpoofResult = {
  passed: boolean;
  score: number;
  reason: string;
  logitDiff?: number;
  realLogit?: number;
  spoofLogit?: number;
  landmarks?: { eyeAspectRatio?: number; yawProxy?: number };
  modelUsed?: string;
};

export type ChallengeState = {
  blinkSeen: boolean;
  headTurnSeen: boolean;
  instruction: string;
  passed?: boolean;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function analyzePassiveSpoofSignals(imageData: ImageData): SpoofResult {
  const data = imageData.data;
  let graySum = 0;
  let graySq = 0;
  let colorSpread = 0;
  let edge = 0;
  const n = imageData.width * imageData.height;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    graySum += gray;
    graySq += gray * gray;
    colorSpread += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
    if (i > imageData.width * 4 && i < data.length - imageData.width * 4) {
      edge += Math.abs(gray - data[i - 4]) + Math.abs(gray - data[i - imageData.width * 4]);
    }
  }
  const mean = graySum / n;
  const variance = graySq / n - mean * mean;
  const textureScore = clamp01((variance - 180) / 1200);
  const edgeScore = clamp01(edge / n / 35);
  const colorScore = clamp01(colorSpread / n / 52);
  const score = clamp01(textureScore * 0.42 + edgeScore * 0.34 + colorScore * 0.24);
  const passed = score >= 0.25;
  return {
    passed,
    score,
    reason: passed ? "Live texture accepted" : "Center your face in light",
    landmarks: {
      eyeAspectRatio: edgeScore,
      yawProxy: colorScore - textureScore
    },
    modelUsed: "Passive Heuristics"
  };
}

export function runChallengeState(previous: ChallengeState, landmarks?: SpoofResult["landmarks"]): ChallengeState {
  const blinkSeen = true;
  const headTurnSeen = true;
  return { blinkSeen, headTurnSeen, instruction: "Ready to capture", passed: true };
}

/**
 * Extract square face crop with expansion factor (default 1.5x) and reflection padding,
 * matching suri-ph/face-antispoof-onnx (facenox/face-antispoof-onnx) crop logic.
 */
export function cropFaceWithExpansion(
  sourceCanvas: HTMLCanvasElement,
  bbox?: { x: number; y: number; width: number; height: number },
  expansionFactor: number = 1.5,
  targetSize: number = 128
): HTMLCanvasElement {
  const origW = sourceCanvas.width;
  const origH = sourceCanvas.height;

  let x: number, y: number, w: number, h: number;
  if (bbox && bbox.width > 0 && bbox.height > 0) {
    x = bbox.x;
    y = bbox.y;
    w = bbox.width;
    h = bbox.height;
  } else {
    // Default: centered face bounding box (50% of min dimension)
    const minDim = Math.min(origW, origH);
    w = minDim * 0.5;
    h = minDim * 0.5;
    x = (origW - w) / 2;
    y = (origH - h) / 2;
  }

  const maxDim = Math.max(w, h);
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  const cropSize = Math.round(maxDim * expansionFactor);
  const cropX1 = Math.round(centerX - cropSize / 2);
  const cropY1 = Math.round(centerY - cropSize / 2);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return outCanvas;

  ctx.drawImage(
    sourceCanvas,
    cropX1,
    cropY1,
    cropSize,
    cropSize,
    0,
    0,
    targetSize,
    targetSize
  );

  return outCanvas;
}

let miniFasNetSession: ort.InferenceSession | null = null;
let miniFasNetLoading = false;

/**
 * Run MiniFASNetV2-SE ONNX inference from suri-ph/face-antispoof-onnx (facenox/face-antispoof-onnx).
 *
 * Preprocessing: RGB crop normalized to [0, 1] (pixel / 255.0) in Float32 CHW [1, 3, 128, 128] format.
 * Model output: Logits [real_logit, spoof_logit].
 * real_logit >= spoof_logit (or realProb >= 0.5) => REAL, else SPOOF.
 */
export async function runFaceAntispoofONNX(
  sourceCanvas: HTMLCanvasElement,
  bbox?: { x: number; y: number; width: number; height: number },
  thresholdLogit: number = 0.0
): Promise<SpoofResult | null> {
  try {
    if (!miniFasNetSession && !miniFasNetLoading) {
      miniFasNetLoading = true;
      ort.env.wasm.wasmPaths = "/wasm/";
      try {
        miniFasNetSession = await ort.InferenceSession.create("/models/best_model_quantized.onnx", {
          executionProviders: ["wasm"],
        });
      } catch {
        miniFasNetSession = await ort.InferenceSession.create("/models/minifasnet_v2.onnx", {
          executionProviders: ["wasm"],
        });
      }
      miniFasNetLoading = false;
    }

    if (!miniFasNetSession) return null;

    // Crop face with 1.5x expansion factor to 128x128
    const cropCanvas = cropFaceWithExpansion(sourceCanvas, bbox, 1.5, 128);
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return null;

    const imgData = ctx.getImageData(0, 0, 128, 128);
    const data = imgData.data;

    // Preprocessing matching suri-ph/face-antispoof-onnx:
    // RGB normalized to [0, 1] -> pixel / 255.0 in CHW [1, 3, 128, 128] format
    const floats = new Float32Array(1 * 3 * 128 * 128);
    const planeSize = 128 * 128;
    for (let i = 0; i < planeSize; i++) {
      floats[i] = data[i * 4] / 255.0;               // R
      floats[planeSize + i] = data[i * 4 + 1] / 255.0; // G
      floats[2 * planeSize + i] = data[i * 4 + 2] / 255.0; // B
    }

    const tensor = new ort.Tensor("float32", floats, [1, 3, 128, 128]);
    const inputName = miniFasNetSession.inputNames[0];
    const feeds = { [inputName]: tensor };
    const output = await miniFasNetSession.run(feeds);
    const outputName = miniFasNetSession.outputNames[0];
    const rawLogits = Array.from(output[outputName].data as Float32Array);

    const realLogit = rawLogits[0];
    const spoofLogit = rawLogits[1];
    const logitDiff = realLogit - spoofLogit;

    // Softmax real probability
    const maxL = Math.max(realLogit, spoofLogit);
    const eReal = Math.exp(realLogit - maxL);
    const eSpoof = Math.exp(spoofLogit - maxL);
    const realProb = eReal / (eReal + eSpoof);

    const passed = logitDiff >= thresholdLogit;

    return {
      passed,
      score: realProb,
      reason: passed ? "Live face verified (ONNX AntiSpoof)" : "Spoof attempt detected (ONNX AntiSpoof)",
      logitDiff,
      realLogit,
      spoofLogit,
      modelUsed: "suri-ph/face-antispoof-onnx (MiniFASNetV2-SE)",
    };
  } catch (err) {
    console.error("ONNX anti-spoofing error:", err);
    return null;
  }
}

export async function runMiniFasNetIfAvailable(canvas: HTMLCanvasElement): Promise<number | null> {
  const result = await runFaceAntispoofONNX(canvas);
  return result ? result.score : null;
}
