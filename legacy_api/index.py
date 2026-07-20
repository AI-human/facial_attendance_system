from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from .db import get_conn, init_db

app = FastAPI(title="FaceRoll Phase V2 API")

class EnrollPayload(BaseModel):
    userId: str = Field(min_length=2)
    embedding: List[float] = Field(min_length=512, max_length=512)
    quality: float = Field(ge=0, le=1)

class AttendancePayload(BaseModel):
    userId: str = Field(min_length=2)
    sessionId: str = Field(min_length=2)
    similarity: float = Field(ge=-1, le=1)
    spoofScore: float = Field(ge=0, le=1)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/api/python/health")
def health():
    return {"ok": True, "service": "faceroll-v2"}

@app.post("/api/python/enroll")
def enroll(payload: EnrollPayload):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into face_embeddings (user_id, embedding, quality)
                    values (%s, %s, %s)
                    on conflict (user_id) do update set embedding = excluded.embedding, quality = excluded.quality, updated_at = now()
                    """,
                    (payload.userId, payload.embedding, payload.quality),
                )
            conn.commit()
        return {"ok": True, "stored": len(payload.embedding)}
    except Exception as e:
        return {"ok": True, "offline": True, "note": str(e)}

@app.get("/api/python/embedding")
def embedding(user_id: str):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("select embedding, quality from face_embeddings where user_id = %s", (user_id,))
                row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Embedding not found")
        return {"embedding": row[0], "quality": row[1]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Database offline: {e}")

@app.post("/api/python/attendance")
def attendance(payload: AttendancePayload):
    if payload.spoofScore < 0.20:
        raise HTTPException(status_code=400, detail="Liveness score too low")
    if payload.similarity < 0.35:
        raise HTTPException(status_code=400, detail="Face similarity too low")
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into attendance (user_id, session_id, similarity, spoof_score, status)
                    values (%s, %s, %s, %s, 'present')
                    on conflict (user_id, session_id) do update set
                      similarity = excluded.similarity,
                      spoof_score = excluded.spoof_score,
                      status = 'present',
                      checked_at = now()
                    """,
                    (payload.userId, payload.sessionId, payload.similarity, payload.spoofScore),
                )
            conn.commit()
        return {"ok": True, "status": "present"}
    except Exception as e:
        return {"ok": True, "status": "present", "offline": True, "note": str(e)}
