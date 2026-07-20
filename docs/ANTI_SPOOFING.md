# Anti-Spoofing Comparison

| Method | Blocks printed photo | Blocks screen replay | Mobile latency | Model size | Pros | Cons |
|---|---:|---:|---:|---:|---|---|
| Passive texture/sharpness | Medium | Low–Medium | 8–18 ms | 0 | Free, instant | Not enough alone |
| Blink challenge | High vs photo | Medium | 1–3 s human time | 0 | Simple UX | Replay can mimic |
| Head-turn challenge | High vs flat photo | Medium–High | 1–3 s human time | 0 | Catches planar attacks | Needs landmark quality |
| MiniFASNet v2 | High | High | 25–50 ms | ~1.9 MB | Best lightweight RGB option | Needs trusted ONNX weights |
| Depth/IR camera | Very high | Very high | device-specific | N/A | Strong security | Not universal on mobile web |
| Server review/manual audit | High | High | slow | N/A | Human confidence | Not real-time |

## Recommended Phase V2 setup

Use a three-layer gate:

1. Passive quality score.
2. Active blink or head-turn challenge.
3. MiniFASNet v2 live probability when model file is available.

Reject check-in if either similarity or liveness is below threshold.
