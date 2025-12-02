FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8082

# Use python3 explicitly or create symlink
RUN ln -sf /usr/local/bin/python3 /usr/local/bin/python

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8082"]
