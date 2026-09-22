FROM python:3.12-slim AS builder

WORKDIR /app
COPY services/items-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

RUN groupadd -r fusion && useradd -r -g fusion fusion

COPY --from=builder /root/.local /home/fusion/.local
COPY services/items-service/ /app/

ENV PATH=/home/fusion/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
USER fusion

EXPOSE 8002
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8002/health/live || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
