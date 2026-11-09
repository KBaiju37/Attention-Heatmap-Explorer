from pydantic import BaseModel


class HealthResponse(BaseModel):
    application: str
    status: str
    version: str
    environment: str
