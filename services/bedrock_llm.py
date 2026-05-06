"""
Bedrock LLM client that implements the `chat(messages)` interface
expected by all MediBot agents.
"""

import json

from services.aws_clients import get_bedrock
from config.models import AGENT_CONFIG, MODEL_ID


def parse_bedrock_json(response: dict) -> dict:
    """Safely parse JSON from Bedrock response, handling markdown fences."""
    text = response["content"][0]["text"].strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Agent returned invalid JSON: {e}\nRaw: {text}")


class BedrockLLMClient:
    """
    LLM client backed by Amazon Bedrock.

    Implements the `chat(messages) -> str` interface expected by all MediBot agents.

    Usage:
        from services.bedrock_llm import BedrockLLMClient
        client = BedrockLLMClient(agent_name="triage")
        agent = TriageAgent(llm_client=client)
    """

    def __init__(self, agent_name: str = "triage"):
        """
        Initialize with agent-specific model and token config.

        Args:
            agent_name: Key from config.models.AGENT_CONFIG
                        (triage, decision, emergency, suggestion, followup,
                         health_record, prescription, doctor_rec, booking)
        """
        config = AGENT_CONFIG.get(agent_name, {"model_id": MODEL_ID, "max_tokens": 800})
        self.model_id = config["model_id"]
        self.max_tokens = config["max_tokens"]

    def chat(self, messages: list) -> str:
        """
        Send messages to Bedrock and return the text response.

        Args:
            messages: List of {"role": "system"|"user"|"assistant", "content": "..."}

        Returns:
            Raw text response from the model.
        """
        # Bedrock Messages API uses system as a top-level param
        system_prompt = ""
        api_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                api_messages.append({
                    "role": msg["role"],
                    "content": [{"type": "text", "text": msg["content"]}],
                })

        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": self.max_tokens,
            "messages": api_messages,
        }

        if system_prompt:
            body["system"] = system_prompt

        response = get_bedrock().invoke_model(
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )

        result = json.loads(response["body"].read())
        return result["content"][0]["text"]
