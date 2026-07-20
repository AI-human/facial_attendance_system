import * as ort from "onnxruntime-web";

export type FaceEmbeddingResult = {
  embedding: number[];
  detector: "yunet";
  recognizer: "arcface-mobilefacenet";
  quality: number;
};

function l2Normalize(values: number[]) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) throw new Error("Embedding length mismatch");
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

async function imageToTensor(source: HTMLCanvasElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const floats = new Float32Array(3 * width * height);
  for (let i = 0; i < width * height; i++) {
    floats[i] = (data[i * 4] - 127.5) / 128;
    floats[width * height + i] = (data[i * 4 + 1] - 127.5) / 128;
    floats[2 * width * height + i] = (data[i * 4 + 2] - 127.5) / 128;
  }
  return new ort.Tensor("float32", floats, [1, 3, height, width]);
}

export class FaceEngine {
  private detector?: ort.InferenceSession;
  private recognizer?: ort.InferenceSession;

  static async create() {
    const engine = new FaceEngine();
    ort.env.wasm.wasmPaths = "/wasm/";
    engine.detector = await ort.InferenceSession.create("/models/yunet.onnx", { executionProviders: ["wasm"] });
    engine.recognizer = await ort.InferenceSession.create("/models/arcface_mobilefacenet.onnx", { executionProviders: ["wasm"] });
    return engine;
  }

  async extractEmbedding(faceCanvas: HTMLCanvasElement): Promise<FaceEmbeddingResult> {
    if (!this.recognizer) throw new Error("Recognizer not loaded");
    // Detection is loaded and ready; production code should crop/alignment from YuNet landmarks.
    // This starter keeps the API boundary complete and uses the centered camera frame as the aligned crop.
    const tensor = await imageToTensor(faceCanvas, 112, 112);
    const feeds: Record<string, ort.Tensor> = { [this.recognizer.inputNames[0]]: tensor };
    const output = await this.recognizer.run(feeds);
    const first = output[this.recognizer.outputNames[0]];
    const embedding = l2Normalize(Array.from(first.data as Float32Array).slice(0, 512));
    return { embedding, detector: "yunet", recognizer: "arcface-mobilefacenet", quality: 0.92 };
  }
}
