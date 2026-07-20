# face-edu

Clean deployable project for the **Phase V2 architecture**:

- **Frontend:** Next.js 15 mobile-first UI.
- **AI/ML:** on-device browser compute only.
  - Detection: YuNet ONNX.
  - Recognition: ArcFace-MobileFaceNet 512-d embedding.
  - Anti-spoofing: passive texture + active challenge + optional MiniFASNet v2 ONNX hook.
- **Backend:** Vercel Python FastAPI functions for enrollment, embedding fetch, and attendance writes.
- **Database:** Vercel Postgres.
- **Local cache:** IndexedDB stores the enrolled embedding after first fetch/enroll so later check-ins do not need to refetch unless browser data is cleared.

## Quick local run

```bash
npm install
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env.local
# set POSTGRES_URL in .env.local
npm run dev
```

Open `http://localhost:3000`.

## Required model files

Put the ONNX files in `public/models/`:

```text
public/models/yunet.onnx
public/models/arcface_mobilefacenet.onnx
public/models/minifasnet_v2.onnx      # optional but recommended
```

Run:

```bash
node scripts/check-models.mjs
```

## Vercel deploy

```bash
git init
git add .
git commit -m "FaceRoll phase v2"
vercel link
vercel env add POSTGRES_URL
vercel env add API_SECRET
vercel deploy --prod
```

Run `db/schema.sql` in Vercel Postgres before testing production enrollment.

## Flow

1. Student opens `/enroll`.
2. Phone runs liveness checks and extracts ArcFace embedding.
3. Server saves only the 512-d embedding and quality score.
4. Student opens `/check-in/[sessionId]`.
5. Browser loads cached embedding; if absent, fetches from server once and caches it.
6. Browser verifies live face locally.
7. Server receives only final attendance metrics: user id, session id, similarity, spoof score.
