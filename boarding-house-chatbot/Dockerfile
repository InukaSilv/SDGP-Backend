# Use the official PyTorch image with Python 3.10
FROM pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the chatbot code
COPY . .

# Expose the port
EXPOSE 5002

# Set environment variables
ENV PORT=5002
ENV HOST=0.0.0.0

# Run the chatbot
CMD ["python", "chatbot.py"]