import boto3
from functools import lru_cache

REGION = "us-east-1"


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
