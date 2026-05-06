import os
import uuid
from datetime import datetime, timedelta, timezone

from backend.config.tables import TABLES
from backend.services.aws_clients import get_dynamodb

QR_BASE_URL = os.environ.get("QR_BASE_URL", "https://medibot.app/qr")
QR_EXPIRY_MINUTES = int(os.environ.get("QR_EXPIRY_MINUTES", "60"))


def generate_qr_token(episode_id: str, patient_id: str) -> str:
    """Generate a unique QR token for an episode and store it in DynamoDB. Returns the URL."""
    token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(minutes=QR_EXPIRY_MINUTES)

    table = get_dynamodb().Table(TABLES["qr_tokens"])
    table.put_item(
        Item={
            "token": token,
            "episode_id": episode_id,
            "patient_id": patient_id,
            "expires_at": expiry.isoformat(),
            "used": False,
        },
        ConditionExpression="attribute_not_exists(#t)",
        ExpressionAttributeNames={"#t": "token"},
    )

    return f"{QR_BASE_URL}/{token}"


def scan_qr_token(token: str) -> dict:
    """Validate and consume a QR token. Returns episode_id and patient_id."""
    table = get_dynamodb().Table(TABLES["qr_tokens"])
    response = table.get_item(Key={"token": token})
    item = response.get("Item")

    if not item:
        raise ValueError("Invalid QR token")

    # Check expiry
    expires_at = datetime.fromisoformat(item["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("QR token has expired")

    # Check single-use
    if item.get("used"):
        raise ValueError("QR token has already been used")

    # Mark as used
    table.update_item(
        Key={"token": token},
        UpdateExpression="SET #u = :val",
        ExpressionAttributeNames={"#u": "used"},
        ExpressionAttributeValues={":val": True},
    )

    return {
        "episode_id": item["episode_id"],
        "patient_id": item["patient_id"],
    }
