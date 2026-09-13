"""OpenTelemetry tracing (Faz 8, spec §30).

Produces spans shaped like the example in ROADMAP.md §30 — a chat turn
span carrying `session_id`, `intent`-adjacent attributes, and a child span
per tool call with `tool`, `duration_ms` (via the span's own timing) and
`status`.

Exports to the console by default (so tracing is visible/verifiable with
zero extra infrastructure) or to an OTLP collector (Jaeger, Tempo, ...) if
`OTEL_EXPORTER_OTLP_ENDPOINT` is set — the real deployment path.
"""
import os

from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
    SimpleSpanProcessor,
)

_configured = False


def configure_tracing(service_name: str = "finvoice-backend") -> None:
    global _configured
    if _configured:
        return

    provider = TracerProvider(resource=Resource.create({SERVICE_NAME: service_name}))

    otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if otlp_endpoint:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

        exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        # A real collector benefits from batching; export immediately
        # otherwise (console exporter has no batching thread lingering
        # past process/test-session shutdown to worry about).
        provider.add_span_processor(BatchSpanProcessor(exporter))
    else:
        exporter = ConsoleSpanExporter()
        provider.add_span_processor(SimpleSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    _configured = True


def get_tracer():
    return trace.get_tracer("finvoice.backend")
