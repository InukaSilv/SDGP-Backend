from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

model = SentenceTransformer('all-MiniLM-L6-v2')

listings = [
    "Affordable boarding house near university with WiFi.",
    "Luxury apartment close to city center, pet-friendly.",
    "Budget-friendly room for students, near public transport."
]

embeddings = np.array([model.encode(text) for text in listings])
index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(embeddings)

@app.route("/recommend", methods=["POST"])
def recommend():
    user_message = request.json["message"]
    user_embedding = model.encode(user_message).reshape(1, -1)
    distances, indices = index.search(user_embedding, k=3)
    recommended = [listings[i] for i in indices[0]]
    return jsonify({"recommendations": recommended})

if __name__ == "__main__":
    app.run(port=5001)
