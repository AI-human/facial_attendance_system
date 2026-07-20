# Model files

Place these ONNX files here before production deployment:

| File | Purpose | Target size |
|---|---|---:|
| `yunet.onnx` | OpenCV YuNet face detection | ~340 KB |
| `arcface_mobilefacenet.onnx` | 512-d face embedding | ~5 MB |
| `minifasnet_v2.onnx` | Optional anti-spoofing live probability | ~1.9 MB |

The app code is wired for these paths. Model weights are not bundled because licensing and source trust must be pinned by your team.
