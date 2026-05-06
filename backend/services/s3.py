from typing import Optional

from backend.config.buckets import BUCKETS
from backend.services.aws_clients import get_s3


def upload_file(
    bucket_key: str,
    key: str,
    body: bytes,
    content_type: str,
    metadata: Optional[dict] = None,
) -> dict:
    """Upload a file to S3 with KMS server-side encryption."""
    params = {
        "Bucket": BUCKETS[bucket_key],
        "Key": key,
        "Body": body,
        "ContentType": content_type,
        "ServerSideEncryption": "aws:kms",
    }
    if metadata:
        params["Metadata"] = metadata

    return get_s3().put_object(**params)


def generate_presigned_url(bucket_key: str, key: str, expiry: int = 60) -> str:
    """Generate a presigned URL for downloading an object."""
    return get_s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKETS[bucket_key], "Key": key},
        ExpiresIn=expiry,
    )


def get_file(bucket_key: str, key: str) -> dict:
    """Get a file object from S3."""
    return get_s3().get_object(Bucket=BUCKETS[bucket_key], Key=key)
