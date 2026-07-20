import { existsSync, statSync } from "node:fs";

const expected = [
  ["public/models/yunet.onnx", 100_000],
  ["public/models/arcface_mobilefacenet.onnx", 1_000_000],
];
let ok = true;
for (const [file, min] of expected) {
  if (!existsSync(file)) {
    console.error(`Missing ${file}`);
    ok = false;
    continue;
  }
  const size = statSync(file).size;
  if (size < min) {
    console.error(`${file} looks too small: ${size} bytes`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
