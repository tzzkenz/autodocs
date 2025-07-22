from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/user', methods=['GET'])
def get_users():
    return jsonify({"users": []})

@app.route('/login', methods=['POST'])
def login():
    return 'ok'
