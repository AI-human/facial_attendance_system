# FaceRoll Phase V2 Plan

## Architecture

```mermaid
flowchart LR
  Phone[Student mobile browser] -->|YuNet detect| D[Face box]
  D -->|Passive + challenge + optional MiniFASNet| L[Liveness score]
  D -->|ArcFace-MobileFaceNet| E[512-d embedding]
  E -->|first enrollment only| API[Vercel Python API]
  API --> DB[(Vercel Postgres)]
  DB -->|fetch if local cache missing| Phone
  Phone -->|attendance decision metrics| API
```

## Server responsibility

The server does **not** process face images in Phase V2. It only:

- stores the enrollment embedding,
- returns the embedding when the local device cache is empty,
- saves attendance records,
- enforces thresholds for spoof score and similarity.

## Client responsibility

The phone handles:

- camera access,
- YuNet face detection,
- liveness challenge,
- ArcFace-MobileFaceNet embedding extraction,
- cosine similarity verification,
- IndexedDB embedding cache.
