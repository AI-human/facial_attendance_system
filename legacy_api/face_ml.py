"""
Optional Python ML utilities.

Phase V2 intentionally runs detection, spoofing, and recognition on the user's
mobile browser. This file is here only for offline evaluation / batch testing,
not for production check-in compute.
"""

from typing import List
import math

def cosine_similarity(a: List[float], b: List[float]) -> float:
    if len(a) != len(b):
        raise ValueError("embedding length mismatch")
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)
