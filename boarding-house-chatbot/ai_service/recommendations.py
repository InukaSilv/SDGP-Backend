from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

listings = [
    "Affordable boarding house near university with WiFi.",
    "Luxury apartment close to city center, pet-friendly.",
    "Budget-friendly room for students, near public transport."
]

listing_embeddings = model.encode(listings)

dimension = listing_embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(np.array(listing_embeddings, dtype=np.float32))

def recommend_houses(user_query):
    query_embedding = model.encode([user_query])
    _, indices = index.search(np.array(query_embedding, dtype=np.float32), k=2)
    return [listings[i] for i in indices[0]]

print(recommend_houses("I want a room near a public transport"))

