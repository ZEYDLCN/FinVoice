from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import cards, claims, customers, health, policies, support
from app.core.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Mock Customer / Policy / Claims / Card / Support APIs standing in for "
        "real banking & insurance core systems. Built for the FinVoice Ops "
        "Voice AI platform — see ROADMAP.md for the full phase plan."
    ),
)

# Faz 8: generic HTTP request metrics at GET /metrics.
Instrumentator().instrument(app).expose(app)


@app.exception_handler(NotFoundError)
def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.message})


@app.exception_handler(ConflictError)
def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": exc.message})


app.include_router(health.router)
app.include_router(customers.router, prefix=settings.api_prefix)
app.include_router(policies.router, prefix=settings.api_prefix)
app.include_router(claims.router, prefix=settings.api_prefix)
app.include_router(cards.router, prefix=settings.api_prefix)
app.include_router(support.router, prefix=settings.api_prefix)
