import logging
import os
from typing import Optional

from boto3.dynamodb.conditions import Key
from backend.config.tables import TABLES
from backend.services.aws_clients import get_dynamodb

logger = logging.getLogger(__name__)
DEV_MODE = os.environ.get("DEV_MODE", "true").lower() == "true"


def get_table(table_key: str):
    """Returns a DynamoDB Table object for the given table key."""
    return get_dynamodb().Table(TABLES[table_key])


def get_item(table_key: str, key: dict, projection: Optional[str] = None) -> Optional[dict]:
    """Get a single item by primary key with optional projection."""
    try:
        params = {"Key": key}
        if projection:
            attrs = [a.strip() for a in projection.split(",")]
            expr_names = {}
            safe_attrs = []
            for attr in attrs:
                safe_name = f"#{attr}"
                expr_names[safe_name] = attr
                safe_attrs.append(safe_name)
            params["ProjectionExpression"] = ", ".join(safe_attrs)
            params["ExpressionAttributeNames"] = expr_names

        table = get_table(table_key)
        response = table.get_item(**params)
        return response.get("Item")
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"DynamoDB get_item failed (dev mode): {e}")
            return None
        raise


def put_item(table_key: str, item: dict, condition: Optional[str] = None) -> dict:
    """Put an item with optional condition expression to prevent overwrites."""
    try:
        params = {"Item": item}
        if condition:
            params["ConditionExpression"] = condition

        table = get_table(table_key)
        return table.put_item(**params)
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"DynamoDB put_item failed (dev mode): {e}")
            return {}
        raise


def query_items(
    table_key: str,
    key_condition,
    projection: Optional[str] = None,
    index_name: Optional[str] = None,
) -> list:
    """Query items using a key condition expression."""
    try:
        params = {"KeyConditionExpression": key_condition}

        if projection:
            attrs = [a.strip() for a in projection.split(",")]
            expr_names = {}
            safe_attrs = []
            for attr in attrs:
                safe_name = f"#{attr}"
                expr_names[safe_name] = attr
                safe_attrs.append(safe_name)
            params["ProjectionExpression"] = ", ".join(safe_attrs)
            params["ExpressionAttributeNames"] = expr_names

        if index_name:
            params["IndexName"] = index_name

        table = get_table(table_key)
        response = table.query(**params)
        return response.get("Items", [])
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"DynamoDB query_items failed (dev mode): {e}")
            return []
        raise


def batch_write(table_key: str, items: list) -> None:
    """Batch write items to a table — never write one by one."""
    try:
        table = get_table(table_key)
        with table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
    except Exception as e:
        if DEV_MODE:
            logger.warning(f"DynamoDB batch_write failed (dev mode): {e}")
            return
        raise
