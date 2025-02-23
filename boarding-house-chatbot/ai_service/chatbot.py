from flask import Flask, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from datetime import datetime
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

#Load environment variables
load_dotenv()

app = Flask(__name__)

class BoardingHouseChatbot:
    def __init__(self):
        
        #Initializing the model and tokenizer
        self.model_path = os.getenv('MODEL_PATH', 'microsoft/DialoGPT-medium')
        print(f"Loading model from {self.model_path}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
        self.model = AutoModelForCausalLM.from_pretrained(self.model_path)

        #Database configuration
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'Hasindu@123'),
            'database': os.getenv('DB_DATABASE', 'boarding_house_chatbot')
        }

        # Initialize database
        self.setup_database()
    
    def get_db_connection(self):
        try:
            connection = mysql.connector.connect(**self.db_config)
            return connection
        except Error as e:
            print(f"Error connecting to database: {e}")
            return None
        
    def setup_database(self):
            connection = self.get_db_connection()

            if connection:
                try:
                    cursor = connection.cursor()

                    #Create database if not exists
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.db_config['database']}")
                    cursor.execute(f"USE {self.db_config['database']}")

                    #Create table to store chats
                    create_table_query = """
                    CREATE TABLE IF NOT EXISTS chats (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        user_message TEXT NOT NULL,
                        bot_response TEXT NOT NULL,
                        timestamp DATETIME NOT NULL,
                        conversation_id VARCHAR(255) NOT NULL,
                        INDEX idx_conversation (conversation_id)
                    )
                    """
                    cursor.execute(create_table_query)
                    connection.commit()
                    print("Dataset and table setup completed successfully")

                except Error as e:
                    print(f"Error setting up dataset: {e}")
                finally:
                    cursor.close()
                    connection.close()

    def save_chat(self, user_id, user_message, bot_response, conversation_id):
        connection = self.get_db_connection()
        try:
            cursor = connection.cursor()

            insert_query = """
            INSERT INTO chats (user_id, user_message, bot_response, timestamp, conversation_id)
            VALUES (%s, %s, %s, %s, %s)
            """

            values = (user_id, user_message, bot_response, datetime.now(), conversation_id)

            cursor.execute(insert_query, values)
            connection.commit()
            return True

        except Error as e:
            print(f"Error saving chat: {e}")
            return False
        finally:
            cursor.close()
            connection.close()

    def generate_response(self, user_input, conversation_history=None):
        try:
            #Encode user inputs
            input_ids = self.tokenizer.encode(user_input + self.tokenizer.eos_token, return_tensors='pt')

            #Append the chat history if there is any
            if conversation_history is not None:
                input_ids = torch.cat([conversation_history, input_ids], dim=1)

            #Generate response 
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

            #Decode response
            response = self.tokenizer.decode(response_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
            return response
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I apologize, but I'm having trouble generating a response right now."
    
    def process_user_message(self, user_id, user_message, conversation_id):
        
        #Generate response
        bot_response = self.generate_response(user_message)
        
        #Save to database
        save_success = self.save_chat(user_id, user_message, bot_response, conversation_id)

        return {
            'response' : bot_response,
            'saved' : save_success
        }
    
#Initialize chatbot
chatbot = BoardingHouseChatbot()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json 
    if not all(k in data for k in ['user_id','message','conversation_id']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = chatbot.process_user_message(
        data['user_id'],
        data['message'],
        data['conversation_id']
    )

    return jsonify(result)

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host = '0.0.0.0', port=port, debug=True)
        
    