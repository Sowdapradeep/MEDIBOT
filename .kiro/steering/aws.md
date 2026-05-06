# AWS Configuration & Efficiency Rules for MediBot

## Credentials

AWS credentials are pre-configured in the environment via Kiro's AWS integration.
Never hardcode credentials. Never use boto3 with explicit keys. Always use:

```python
boto3.client("service", region_name="ap-south-1")
```

Default region: ap-south-1 (Mumbai) — closest to Indian users, lowest latency.

---

## Client Initialization Rules

NEVER create boto3 clients inside functions or agent methods.
ALWAYS create them once at module level and reuse.

```python
# services/aws_clients.py — single source of truth for all AWS clients

import boto3
from functools import lru_cache

REGION = "ap-south-1"

@lru_cache(maxsize=None)
def get_bedrock():
    return boto3.client("bedrock-runtime", region_name=REGION)

@lru_cache(maxsize=None)
def get_dynamodb():
    return boto3.resource("dynamodb", region_name=REGION)

@lru_cache(maxsize=None)
def get_s3():
    return boto3.client("s3", region_name=REGION)

@lru_cache(maxsize=None)
def get_textract():
    return boto3.client("textract", region_name=REGION)

@lru_cache(maxsize=None)
def get_transcribe():
    return boto3.client("transcribe", region_name=REGION)

@lru_cache(maxsize=None)
def get_polly():
    return boto3.client("polly", region_name=REGION)

@lru_cache(maxsize=None)
def get_sns():
    return boto3.client("sns", region_name=REGION)

@lru_cache(maxsize=None)
def get_cognito():
    return boto3.client("cognito-idp", region_name=REGION)

@lru_cache(maxsize=None)
def get_location():
    return boto3.client("location", region_name=REGION)
```

Import like this everywhere:

```python
from services.aws_clients import get_bedrock, get_dynamodb, get_s3
```

---

## DynamoDB Efficiency Rules

### Table Names (never hardcode strings inline — always use these constants)

```python
# config/tables.py
TABLES = {
    "patients":     "medibot-patients",
    "episodes":     "medibot-episodes",
    "appointments": "medibot-appointments",
    "medicines":    "medibot-medicines",
    "followups":    "medibot-followups",
    "doctors":      "medibot-doctors",
    "qr_tokens":    "medibot-qr-tokens",
}
```

### Always use resource (not client) for table operations

```python
# CORRECT
table = get_dynamodb().Table(TABLES["episodes"])
table.put_item(Item={...})

# WRONG — never use low-level client for basic CRUD
dynamodb_client.put_item(TableName="medibot-episodes", Item={...})
```

### Batch writes — never write items one by one in a loop

```python
# CORRECT — batch write
with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)

# WRONG — N separate API calls
for item in items:
    table.put_item(Item=item)
```

### ProjectionExpression — never fetch full items when you need 2-3 fields

```python
# CORRECT
response = table.get_item(
    Key={"patient_id": pid},
    ProjectionExpression="patient_id, #lang, phone",
    ExpressionAttributeNames={"#lang": "language"}
)

# WRONG — fetches entire record including all health history
response = table.get_item(Key={"patient_id": pid})
```

### Always use ConditionExpression for writes to prevent overwrites

```python
table.put_item(
    Item=item,
    ConditionExpression="attribute_not_exists(patient_id)"
)
```

### Query over Scan — never use scan on production tables

```python
# CORRECT
table.query(
    KeyConditionExpression=Key("patient_id").eq(pid)
)

# WRONG — scans entire table
table.scan(FilterExpression=Attr("patient_id").eq(pid))
```

---

## Bedrock Efficiency Rules

### Model to use

```python
MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"
# Fallback for lower cost on non-critical agents:
MODEL_ID_FAST = "anthropic.claude-3-haiku-20240307-v1:0"
```

- Use Sonnet for: Triage, Decision, Emergency agents (accuracy critical)
- Use Haiku for: Suggestion, Follow-Up, Booking, Prescription parsing (speed + cost)

### Always set max_tokens per agent — never use default

```python
# Triage, Decision, Emergency
max_tokens = 800

# Suggestion, Follow-Up, Health Record
max_tokens = 600

# Prescription Parsing
max_tokens = 1000

# Doctor Recommendation, Booking
max_tokens = 500
```

### Response streaming — use for frontend chat only

```python
# For real-time chat UI only
response = get_bedrock().invoke_model_with_response_stream(
    modelId=MODEL_ID,
    body=json.dumps({...})
)
for event in response["body"]:
    chunk = json.loads(event["chunk"]["bytes"])
    yield chunk["delta"]["text"]
```

### Always parse Bedrock response safely

```python
def parse_bedrock_json(response: dict) -> dict:
    text = response["content"][0]["text"].strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Agent returned invalid JSON: {e}\nRaw: {text}")
```

---

## S3 Efficiency Rules

### Bucket names

```python
# config/buckets.py
BUCKETS = {
    "prescriptions": "medibot-prescriptions-prod",
    "reports":       "medibot-reports-prod",
    "qr_artifacts":  "medibot-qr-artifacts-prod",
}
```

### Presigned URLs — always set short TTL for QR sharing

```python
def generate_presigned_url(bucket: str, key: str, expiry_seconds: int = 60) -> str:
    return get_s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expiry_seconds  # 60s for QR, 3600s for patient downloads
    )
```

### Always use server-side encryption on upload

```python
get_s3().put_object(
    Bucket=BUCKETS["prescriptions"],
    Key=f"{patient_id}/{episode_id}/prescription.jpg",
    Body=image_bytes,
    ContentType="image/jpeg",
    ServerSideEncryption="aws:kms",  # Always encrypt
    Metadata={"patient_id": patient_id, "episode_id": episode_id}
)
```

### Never store patient_id in S3 key directly — use episode_id

```python
# CORRECT — episode_id only in key path
key = f"episodes/{episode_id}/prescription.jpg"

# WRONG — PII in key
key = f"patients/{patient_phone}/prescription.jpg"
```

---

## Textract Efficiency Rules

### Use async for large prescription images

```python
async def parse_prescription_async(bucket: str, key: str) -> dict:
    # Start async job
    response = get_textract().start_document_text_detection(
        DocumentLocation={"S3Object": {"Bucket": bucket, "Name": key}}
    )
    job_id = response["JobId"]

    # Poll with exponential backoff
    import asyncio
    delay = 2
    for _ in range(10):
        await asyncio.sleep(delay)
        result = get_textract().get_document_text_detection(JobId=job_id)
        if result["JobStatus"] == "SUCCEEDED":
            return extract_text_blocks(result)
        delay = min(delay * 1.5, 15)

    raise TimeoutError("Textract job timed out")

def extract_text_blocks(result: dict) -> str:
    return " ".join(
        block["Text"]
        for block in result["Blocks"]
        if block["BlockType"] == "LINE"
    )
```

### For small clear images (< 5MB) — use sync detect_document_text

```python
def parse_prescription_sync(image_bytes: bytes) -> str:
    response = get_textract().detect_document_text(
        Document={"Bytes": image_bytes}
    )
    return " ".join(
        block["Text"]
        for block in response["Blocks"]
        if block["BlockType"] == "LINE"
    )
```

---

## Transcribe Efficiency Rules

### Use streaming transcription for real-time voice input

```python
# For live mic input in the app — use Amazon Transcribe Streaming
# Language codes for MediBot
LANGUAGE_CODES = {
    "tamil":   "ta-IN",
    "hindi":   "hi-IN",
    "english": "en-IN",  # Indian English
}
```

### Use standard transcription for uploaded audio files

```python
def transcribe_audio_file(bucket: str, key: str, language: str) -> str:
    job_name = f"medibot-{uuid.uuid4()}"
    get_transcribe().start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": f"s3://{bucket}/{key}"},
        MediaFormat="wav",
        LanguageCode=LANGUAGE_CODES[language],
        OutputBucketName=BUCKETS["reports"],
        Settings={"ShowSpeakerLabels": False, "ChannelIdentification": False}
    )
    # Poll for result...
```

---

## Polly Efficiency Rules

### Cache Polly audio for common responses

```python
import hashlib

def synthesize_speech(text: str, language: str) -> bytes:
    # Cache key based on text + language
    cache_key = f"polly/{hashlib.md5(f'{text}{language}'.encode()).hexdigest()}.mp3"

    # Check S3 cache first
    try:
        obj = get_s3().get_object(Bucket=BUCKETS["reports"], Key=cache_key)
        return obj["Body"].read()
    except get_s3().exceptions.NoSuchKey:
        pass

    # Generate and cache
    voice_map = {"tamil": "Aditi", "hindi": "Aditi", "english": "Aditi"}
    response = get_polly().synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_map[language],
        Engine="neural"
    )
    audio = response["AudioStream"].read()
    get_s3().put_object(Bucket=BUCKETS["reports"], Key=cache_key, Body=audio)
    return audio
```

---

## SNS Efficiency Rules

### Topic ARNs — never hardcode, always use env vars

```python
import os

SNS_TOPICS = {
    "alerts":    os.environ["SNS_ALERTS_TOPIC_ARN"],
    "followup":  os.environ["SNS_FOLLOWUP_TOPIC_ARN"],
    "emergency": os.environ["SNS_EMERGENCY_TOPIC_ARN"],
}
```

### Always send SMS + push in one publish call using message attributes

```python
def send_alert(patient_phone: str, message: str, topic: str = "alerts"):
    get_sns().publish(
        TopicArn=SNS_TOPICS[topic],
        Message=message,
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {
                "DataType": "String",
                "StringValue": "Transactional"  # High priority, not promotional
            }
        }
    )
```

---

## Lambda Efficiency Rules

### Each agent = one Lambda function

```
medibot-triage-agent
medibot-decision-agent
medibot-suggestion-agent
medibot-doctor-rec-agent
medibot-booking-agent
medibot-health-record-agent
medibot-prescription-agent
medibot-followup-agent
medibot-emergency-agent
```

### Lambda memory settings per agent

```yaml
# High compute — Bedrock calls
triage:        memory: 512MB  timeout: 30s
decision:      memory: 256MB  timeout: 15s
emergency:     memory: 512MB  timeout: 15s

# Medium compute
suggestion:    memory: 256MB  timeout: 20s
doctor_rec:    memory: 256MB  timeout: 20s
health_record: memory: 256MB  timeout: 20s

# File processing
prescription:  memory: 1024MB timeout: 60s  # Textract async
followup:      memory: 256MB  timeout: 30s
booking:       memory: 128MB  timeout: 15s
```

### Always reuse connections — initialize clients outside handler

```python
# CORRECT — initialized once per Lambda container
dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
table = dynamodb.Table("medibot-episodes")

def handler(event, context):
    # Use table directly — no re-initialization
    result = table.get_item(Key={"episode_id": event["episode_id"]})
```

---

## Environment Variables (set in Lambda + local .env)

```
AWS_REGION=ap-south-1
DYNAMODB_TABLE_PATIENTS=medibot-patients
DYNAMODB_TABLE_EPISODES=medibot-episodes
DYNAMODB_TABLE_APPOINTMENTS=medibot-appointments
DYNAMODB_TABLE_MEDICINES=medibot-medicines
DYNAMODB_TABLE_FOLLOWUPS=medibot-followups
DYNAMODB_TABLE_DOCTORS=medibot-doctors
DYNAMODB_TABLE_QR_TOKENS=medibot-qr-tokens
S3_BUCKET_PRESCRIPTIONS=medibot-prescriptions-prod
S3_BUCKET_REPORTS=medibot-reports-prod
SNS_ALERTS_TOPIC_ARN=arn:aws:sns:ap-south-1:ACCOUNT:medibot-alerts
SNS_FOLLOWUP_TOPIC_ARN=arn:aws:sns:ap-south-1:ACCOUNT:medibot-followup
SNS_EMERGENCY_TOPIC_ARN=arn:aws:sns:ap-south-1:ACCOUNT:medibot-emergency
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_MODEL_FAST=anthropic.claude-3-haiku-20240307-v1:0
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXX
```

---

## Cost Control Rules

- Use Haiku for non-critical agents (Suggestion, Follow-Up, Booking)
- Use Sonnet only for Triage, Decision, Emergency
- Always set max_tokens — never leave it open
- Cache Polly responses in S3 — never regenerate same audio twice
- Use DynamoDB on-demand billing — not provisioned (traffic is unpredictable)
- Set S3 lifecycle rules: delete QR artifacts after 1 hour, archive prescriptions after 1 year
- Enable Lambda Graviton2 (arm64) for 20% cost reduction on all functions

```yaml
Architectures:
  - arm64
```
