import hashlib

from backend.config.buckets import BUCKETS
from backend.services.aws_clients import get_polly, get_s3

VOICE_MAP = {
    "tamil":   "Aditi",
    "hindi":   "Aditi",
    "english": "Aditi",
}


def synthesize_speech(text: str, language: str) -> bytes:
    """Synthesize speech with S3 caching using md5 hash of text+language."""
    cache_key = f"polly/{hashlib.md5(f'{text}{language}'.encode()).hexdigest()}.mp3"

    # Check S3 cache first
    try:
        obj = get_s3().get_object(Bucket=BUCKETS["reports"], Key=cache_key)
        return obj["Body"].read()
    except get_s3().exceptions.NoSuchKey:
        pass

    # Generate speech
    response = get_polly().synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=VOICE_MAP[language],
        Engine="neural",
    )
    audio = response["AudioStream"].read()

    # Cache in S3
    get_s3().put_object(Bucket=BUCKETS["reports"], Key=cache_key, Body=audio)

    return audio
