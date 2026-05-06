from backend.services.aws_clients import get_textract


def parse_prescription_sync(image_bytes: bytes) -> str:
    """Parse prescription image using synchronous Textract (for images < 5MB)."""
    response = get_textract().detect_document_text(
        Document={"Bytes": image_bytes}
    )
    return extract_text_blocks(response)


def extract_text_blocks(result: dict) -> str:
    """Extract LINE-type text blocks from a Textract response."""
    return " ".join(
        block["Text"]
        for block in result["Blocks"]
        if block["BlockType"] == "LINE"
    )
