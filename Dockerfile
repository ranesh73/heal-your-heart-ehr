FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 EHR_DATA_DIR=/data PYTHONPATH=/app/backend:/app
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home ehr && mkdir -p /data /app && chown -R ehr:ehr /data /app
COPY --chown=ehr:ehr backend/ ./
COPY --chown=ehr:ehr scripts/ /app/scripts/
COPY --chown=ehr:ehr --from=frontend /build/dist /app/frontend/dist
USER ehr
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]
