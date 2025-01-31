from flask import Flask, request, jsonify
from transformers import AutoModelForCasualLM, AutoTokenizer
import torch

app = Flask(__name__)

model_name = "microsoft/DialoGPT-medium"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCasualLM.from_pretrained(model_name)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_input = data["message"]

    inputs = tokenizer.encode(user_input + tokenizer.eos_token, return_tensors="pt")
    output = model.generate(inputs, max_lengths=1000, pad_token_id=tokenizer.eos_token_id)

    response = tokenizer.decode(output[:, input.shape[-1]:][0], skip_special_tokens=True)
    return jsonify({"response" : response})

if __name__ == "__main__":
    app.run(port=5000)
    