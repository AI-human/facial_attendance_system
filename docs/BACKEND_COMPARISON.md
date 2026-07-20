# Backend Options

| Backend | Fit for Phase V2 | Cold start | ML hosting | Database work | Verdict |
|---|---|---:|---|---|---|
| Vercel Python FastAPI | Excellent for API-only | Medium | Not used for ML | Good | Chosen |
| Vercel Next.js API routes | Excellent | Low | Not ideal for Python ML | Good | Good alternative |
| Flask on Vercel | Good | Medium | Not used for ML | Good | Simpler, less typed |
| Django on serverless | Medium | Higher | Not used for ML | Heavy | Too much for this phase |
| Node/JS backend | Good | Low | Could run ONNX but not needed | Good | Better if no Python required |
| Dedicated GPU server | Overkill | None warm | Strong | Good | Not needed because ML is on-device |

Phase V2 uses Python only for API/database operations so deployment stays simple and cheap.
