from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from datetime import datetime
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

class BoardingHouseChatbot:
    def __init__(self):
        
        # Initializing the model and tokenizer
        self.model_path = os.getenv('MODEL_PATH', 'microsoft/DialoGPT-medium')
        print(f"Loading model from {self.model_path}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_path)

        # MongoDB configuration
        self.mongo_uri = os.getenv('MONGODB_URI')
        self.db_name = os.getenv('DB_NAME', 'boarding_house_chatbot')
        
        # Initialize database connection
        self.setup_database()
    
    def get_db_connection(self):
        try:
            client = MongoClient(self.mongo_uri)
            # Check if the connection is valid
            client.admin.command('ping')
            db = client[self.db_name]
            return client, db
        except ConnectionFailure as e:
            print(f"Error connecting to MongoDB: {e}")
            return None, None
        
    def setup_database(self):
        client, db = self.get_db_connection()
    
        if client is not None and db is not None:  
            try:
                # Create collection if it doesn't exist
                if "chats" not in db.list_collection_names():
                    db.create_collection("chats")
                
                # Create index for faster queries
                db.chats.create_index("conversation_id")
                print("MongoDB connection and collection setup completed successfully")
            except Exception as e:
                print(f"Error setting up MongoDB: {e}")
            finally:
                client.close()

    def save_chat(self, user_id, user_message, bot_response, conversation_id):
        client, db = self.get_db_connection()
        try:
            if client is not None and db is not None:
                chat_document = {
                    "user_id": user_id,
                    "user_message": user_message,
                    "bot_response": bot_response,
                    "timestamp": datetime.now(),
                    "conversation_id": conversation_id
                }
                
                print(f"Attempting to save document to MongoDB: {conversation_id}")
                result = db.chats.insert_one(chat_document)
                print(f"MongoDB insert result: {result.acknowledged}")
                return result.acknowledged
            print("Database connection is None")
            return False
        except Exception as e:
            print(f"Detailed error saving chat: {e}")
            return False
        finally:
            if client is not None:
                client.close()

    def generate_response(self, user_input, conversation_history=None):
        try:
            # Encode user inputs
            input_ids = self.tokenizer.encode(user_input + self.tokenizer.eos_token, return_tensors='pt')

            # Append the chat history if there is any
            if conversation_history is not None:
                input_ids = torch.cat([conversation_history, input_ids], dim=1)

            # Generate response 
            response_ids = self.model.generate(
                input_ids,
                max_length=1000,
                pad_token_id=self.tokenizer.eos_token_id,
                no_repeat_ngram_size=3,
                do_sample=True,
                top_k=100,
                top_p=0.7,
                temperature=0.8
            )

            # Decode response
            response = self.tokenizer.decode(response_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
            return response
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I apologize, but I'm having trouble generating a response right now."
    
    def process_user_message(self, user_id, user_message, conversation_id):
        print(f"Processing message from {user_id}: {user_message}")
        
        # Generate response
        bot_response = self.generate_response(user_message)
        print(f"Generated response: {bot_response}")
        
        # Save to database
        save_success = self.save_chat(user_id, user_message, bot_response, conversation_id)

        return {
            'response': bot_response,
            'saved': save_success
        }
    
# Initialize chatbot
chatbot = BoardingHouseChatbot()

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json 
    print(f"Received chat request: {data}")
    
    if not all(k in data for k in ['user_id', 'message', 'conversation_id']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = chatbot.process_user_message(
        data['user_id'],
        data['message'],
        data['conversation_id']
    )
    
    print(f"Sending response: {result}")
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'OK', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)