import os
from typing import Optional

from backend.services.aws_clients import get_sns

SNS_TOPICS = {
    "alerts":    os.environ.get("SNS_ALERTS_TOPIC_ARN", ""),
    "followup":  os.environ.get("SNS_FOLLOWUP_TOPIC_ARN", ""),
    "emergency": os.environ.get("SNS_EMERGENCY_TOPIC_ARN", ""),
}


def send_alert(message: str, topic: str = "alerts") -> dict:
    """Publish a transactional alert to the specified SNS topic."""
    return get_sns().publish(
        TopicArn=SNS_TOPICS[topic],
        Message=message,
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {
                "DataType": "String",
                "StringValue": "Transactional",
            }
        },
    )


def send_emergency_alert(
    patient_message: str,
    contact_message: str,
    hospital_alert: Optional[str] = None,
) -> None:
    """Send emergency alerts to patient, emergency contact, and optionally hospital."""
    get_sns().publish(
        TopicArn=SNS_TOPICS["emergency"],
        Message=patient_message,
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {
                "DataType": "String",
                "StringValue": "Transactional",
            }
        },
    )
    get_sns().publish(
        TopicArn=SNS_TOPICS["emergency"],
        Message=contact_message,
        MessageAttributes={
            "AWS.SNS.SMS.SMSType": {
                "DataType": "String",
                "StringValue": "Transactional",
            }
        },
    )
    if hospital_alert:
        get_sns().publish(
            TopicArn=SNS_TOPICS["alerts"],
            Message=hospital_alert,
            MessageAttributes={
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String",
                    "StringValue": "Transactional",
                }
            },
        )
