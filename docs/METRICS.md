# Phase V2 Metrics

## Latency estimate

| Step | Normal mobile | Low-end / max pressure | Notes |
|---|---:|---:|---|
| Camera frame read | 5–12 ms | 20–45 ms | Browser + camera dependent |
| YuNet detection | 15–30 ms | 45–90 ms | ~340 KB model |
| Passive spoof signals | 8–18 ms | 25–60 ms | Canvas pixel analysis |
| MiniFASNet v2 optional | 25–50 ms | 80–160 ms | ~1.9 MB ONNX |
| ArcFace-MobileFaceNet | 40–90 ms | 120–260 ms | ~5 MB ONNX |
| Local cosine match | <1 ms | <3 ms | 512 floats |
| Fetch embedding if cache missing | 60–180 ms | 250–900 ms | Network only on first device/no cache |
| Attendance write | 80–220 ms | 300–1200 ms | Vercel + database |
| Warm total cached check-in | 160–380 ms | 450–950 ms | No embedding fetch |
| First-device check-in | 240–600 ms | 750–2200 ms | Includes server fetch |

## Storage estimate

| Item | Size each | 1,000 students | 10,000 students | 100,000 students |
|---|---:|---:|---:|---:|
| 512-d float64 embedding | ~4 KB | ~4 MB | ~40 MB | ~400 MB |
| Metadata/index overhead | ~1–2 KB | ~2 MB | ~20 MB | ~200 MB |
| Attendance row | ~0.5–1 KB | depends sessions | depends sessions | depends sessions |
| 30 sessions/student/year | ~30 KB/student | ~30 MB | ~300 MB | ~3 GB |

Recommendation: budget **1 GB per 10k active students/year** including indexes, growth, and audit overhead.
