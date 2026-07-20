export async function saveEnrollment(payload: { userId: string; embedding: number[]; quality: number }) {
  const res = await fetch("/api/python/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchEmbedding(userId: string): Promise<number[] | null> {
  const res = await fetch(`/api/python/embedding?user_id=${encodeURIComponent(userId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.embedding;
}

export async function markAttendance(payload: { userId: string; sessionId: string; similarity: number; spoofScore: number }) {
  const res = await fetch("/api/python/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
