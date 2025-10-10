from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

# Mock inventory data
inventory = {
    1: {'S': 10, 'M': 15, 'L': 20, 'XL': 5},
    2: {'S': 8, 'M': 12, 'L': 18, 'XL': 10},
    3: {'S': 5, 'M': 10, 'L': 15, 'XL': 7},
    4: {'S': 12, 'M': 20, 'L': 25, 'XL': 15},
    5: {'S': 6, 'M': 14, 'L': 16, 'XL': 8},
}


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


@app.route('/api/inventory/<int:product_id>/<size>', methods=['GET'])
def get_inventory(product_id, size):
    """
    Get inventory for a specific product and size
    VULNERABLE: Accepts a 'callback_url' parameter that is fetched without validation
    """
    # Check if callback_url is provided (SSRF vulnerability)
    callback_url = request.args.get('callback_url')
    
    if callback_url:
        try:
            # VULNERABLE: Making a request to user-provided URL without validation
            # This allows SSRF attacks
            print(f"[SSRF VULNERABILITY] Making request to: {callback_url}")
            
            # Determine HTTP method based on URL pattern
            if '/delete/' in callback_url:
                response = requests.delete(callback_url, timeout=5)
            else:
                response = requests.get(callback_url, timeout=5)
                
            print(f"[SSRF VULNERABILITY] Response status: {response.status_code}")
            print(f"[SSRF VULNERABILITY] Response body: {response.text[:200]}")
        except Exception as e:
            print(f"[SSRF VULNERABILITY] Error making request: {str(e)}")
    
    # Return inventory data
    if product_id in inventory and size in inventory[product_id]:
        quantity = inventory[product_id][size]
        return jsonify({
            'product_id': product_id,
            'size': size,
            'quantity': quantity,
            'available': quantity > 0
        }), 200
    else:
        return jsonify({
            'product_id': product_id,
            'size': size,
            'quantity': 0,
            'available': False
        }), 200


@app.route('/api/inventory/<int:product_id>', methods=['GET'])
def get_all_inventory(product_id):
    """Get all inventory for a product"""
    if product_id in inventory:
        return jsonify({
            'product_id': product_id,
            'inventory': inventory[product_id]
        }), 200
    else:
        return jsonify({
            'product_id': product_id,
            'inventory': {}
        }), 404


@app.route('/api/inventory/<int:product_id>/<size>', methods=['PUT'])
def update_inventory(product_id, size):
    """Update inventory for a specific product and size"""
    data = request.get_json()
    quantity = data.get('quantity', 0)
    
    if product_id not in inventory:
        inventory[product_id] = {}
    
    inventory[product_id][size] = quantity
    
    return jsonify({
        'product_id': product_id,
        'size': size,
        'quantity': quantity,
        'message': 'Inventory updated successfully'
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8083))
    app.run(host='0.0.0.0', port=port, debug=True)
