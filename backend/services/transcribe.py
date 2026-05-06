import uuid

from backend.config.buckets import BUCKETS
from backend.services.aws_clients import get_transcribe

LANGUAGE_CODES = {
    "tamil":   "ta-IN",
    "hindi":   "hi-IN",
    "english": "en-IN",
}


def transcribe_audio_file(bucket: str, key: str, language: str) -> str:
    """Start a transcription job for an uploaded audio file. Returns the job name."""
    job_name = f"medibot-{uuid.uuid4()}"
    get_transcribe().start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": f"s3://{bucket}/{key}"},
        MediaFormat="wav",
        LanguageCode=LANGUAGE_CODES[language],
        OutputBucketName=BUCKETS["reports"],
        Settings={"ShowSpeakerLabels": False, "ChannelIdentification": False},
    )
    return job_name
