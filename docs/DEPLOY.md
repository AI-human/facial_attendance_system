# GitHub then Vercel Deployment

## 1. Create GitHub repo

```bash
cd faceroll-phase-v2
git init
git add .
git commit -m "Initial FaceRoll phase v2"
git branch -M main
git remote add origin https://github.com/YOUR_USER/faceroll-phase-v2.git
git push -u origin main
```

## 2. Create Vercel project

```bash
npm i -g vercel
vercel login
vercel link
```

## 3. Add database

In Vercel, create Postgres, copy the connection string, then:

```bash
vercel env add POSTGRES_URL
vercel env add API_SECRET
```

Run `db/schema.sql` against the database.

## 4. Add model files

Copy these files into `public/models/` before deploy:

- `yunet.onnx`
- `arcface_mobilefacenet.onnx`
- `minifasnet_v2.onnx` optional

## 5. Deploy

```bash
vercel deploy --prod
```

## 6. Verify

- `/enroll` saves 3 live samples.
- `/check-in/demo-session` verifies from local cache after first enrollment.
- Database contains rows in `face_embeddings` and `attendance`.
