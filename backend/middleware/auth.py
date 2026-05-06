import base64
import json
import os

from fastapi import Depends, HTTPException, Request

# Dev mode: bypass auth when DEV_MODE=true
DEV_MODE = os.environ.get("DEV_MODE", "true").lower() == "true"

DEV_USER = {
    "sub": "dev-patient-001",
    "group": "patients",
    "portal": "patient",
    "user_id": "dev-patient-001",
}


def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without signature verification (Cognito tokens)."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")

    payload = parts[1]
    padding = 4 - len(payload) % 4
    if padding != 4:
        payload += "=" * padding

    decoded = base64.urlsafe_b64decode(payload)
    return json.loads(decoded)


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency that extracts and validates the Bearer token.
    
    In DEV_MODE, returns a mock patient user if no token is provided.
    """
    auth_header = request.headers.get("Authorization")

    # Dev mode bypass — return mock user if no token
    if DEV_MODE and (not auth_header or not auth_header.startswith("Bearer ")):
        return DEV_USER

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")

    token = auth_header.removeprefix("Bearer ").strip()

    # Dev mode: accept "dev-token" as valid
    if DEV_MODE and token == "dev-token":
        return DEV_USER

    try:
        payload = _decode_jwt_payload(token)
    except (ValueError, json.JSONDecodeError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    groups = payload.get("cognito:groups", [])
    if not groups:
        raise HTTPException(status_code=403, detail="User has no assigned group")

    group = groups[0] if isinstance(groups, list) else groups

    portal_map = {
        "patients": "patient",
        "doctors": "doctor",
        "admins": "admin",
    }
    portal = portal_map.get(group, group)

    user_id = payload.get("custom:user_id", sub)

    return {
        "sub": sub,
        "group": group,
        "portal": portal,
        "user_id": user_id,
    }
