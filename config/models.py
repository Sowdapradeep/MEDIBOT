"""Bedrock model IDs and per-agent configuration."""

# Primary model — accuracy critical agents
MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"

# Fast/cheap model — non-critical agents
MODEL_ID_FAST = "anthropic.claude-3-haiku-20240307-v1:0"

# Per-agent model and token configuration
AGENT_CONFIG = {
    "triage": {
        "model_id": MODEL_ID,
        "max_tokens": 800,
    },
    "decision": {
        "model_id": MODEL_ID,
        "max_tokens": 800,
    },
    "emergency": {
        "model_id": MODEL_ID,
        "max_tokens": 800,
    },
    "suggestion": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 600,
    },
    "followup": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 600,
    },
    "health_record": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 600,
    },
    "prescription": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 1000,
    },
    "doctor_rec": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 500,
    },
    "booking": {
        "model_id": MODEL_ID_FAST,
        "max_tokens": 500,
    },
}
