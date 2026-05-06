"""AWS Lambda handler for MediBot FastAPI backend using Mangum."""
from mangum import Mangum
from backend.main import app

handler = Mangum(app, lifespan="off")
