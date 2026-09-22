FROM python:3.12-slim AS builder

WORKDIR /app
COPY services/api-gateway/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

# Run as non-root user for security best practices
RUN groupadd -r fusion && useradd -r -g fusion fusion

COPY --from=builder /root/.local /home/fusion/.local
COPY services/api-gateway/ /app/

ENV PATH=/home/fusion/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
USER fusion

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8000/health/live || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
