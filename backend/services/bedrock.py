import json
from backend.services.aws_clients import get_bedrock

# Claude Sonnet 4 — use for all agents (Haiku deprecated in this account)
MODEL_SONNET = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MODEL_HAIKU = "us.anthropic.claude-sonnet-4-20250514-v1:0"


def invoke_agent(system_prompt: str, user_message: str, model_id: str = MODEL_SONNET, max_tokens: int = 800) -> dict:
    response = get_bedrock().invoke_model(
        modelId=model_id,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}]
        })
    )
    raw = json.loads(response["body"].read())
    text = raw["content"][0]["text"].strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Agent returned invalid JSON: {e}\nRaw output: {text}")
