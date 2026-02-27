export function pythonDockerfile(framework?: string, port?: number): string {
  const exposedPort = port || 8000;

  if (framework === "fastapi") {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${exposedPort}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${exposedPort}"]`;
  }

  if (framework === "django") {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput 2>/dev/null || true
EXPOSE ${exposedPort}
CMD ["gunicorn", "--bind", "0.0.0.0:${exposedPort}", "--workers", "2", "config.wsgi:application"]`;
  }

  if (framework === "flask") {
    return `FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${exposedPort}
CMD ["gunicorn", "--bind", "0.0.0.0:${exposedPort}", "--workers", "2", "app:app"]`;
  }

  // Generic Python
  return `FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt pyproject.toml* ./
RUN \\
  if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; \\
  elif [ -f pyproject.toml ]; then pip install --no-cache-dir .; \\
  fi
COPY . .
EXPOSE ${exposedPort}
CMD ["python", "main.py"]`;
}
