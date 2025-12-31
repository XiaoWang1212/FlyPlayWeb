FROM python:3.12

WORKDIR /app

COPY Backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY Backend/ ./

ENV PYTHONUNBUFFERED=1

CMD ["python", "app.py"]
