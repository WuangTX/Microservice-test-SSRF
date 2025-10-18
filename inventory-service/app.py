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
    """
    Update inventory for a specific product and size
    VULNERABLE: Accepts callback_url to notify after inventory update
    """
    data = request.get_json()
    quantity = data.get('quantity', 0)
    callback_url = data.get('callback_url')  # SSRF vulnerability
    
    if product_id not in inventory:
        inventory[product_id] = {}
    
    # Update inventory
    old_quantity = inventory[product_id].get(size, 0)
    inventory[product_id][size] = quantity
    
    # VULNERABLE: Call callback_url without validation
    if callback_url:
        try:
            print(f"[SSRF VULNERABILITY] Notifying callback: {callback_url}")
            
            # Send inventory update notification
            callback_data = {
                'product_id': product_id,
                'size': size,
                'old_quantity': old_quantity,
                'new_quantity': quantity,
                'timestamp': 'now'
            }
            
            # VULNERABLE: POST to user-provided URL
            response = requests.post(callback_url, json=callback_data, timeout=5)
            print(f"[SSRF VULNERABILITY] Callback response: {response.status_code}")
            
        except Exception as e:
            print(f"[SSRF VULNERABILITY] Callback error: {str(e)}")
    
    return jsonify({
        'product_id': product_id,
        'size': size,
        'quantity': quantity,
        'message': 'Inventory updated successfully'
    }), 200


@app.route('/api/inventory/purchase', methods=['POST'])
def purchase_product():
    """
    Purchase product - decrease inventory
    VULNERABLE: Accepts callback_url in request body for payment gateway notification
    Realistic scenario: Sau khi trừ kho, gửi callback đến payment gateway
    """
    data = request.get_json()
    product_id = data.get('product_id')
    size = data.get('size')
    quantity_to_buy = data.get('quantity', 1)
    callback_url = data.get('callback_url')  # SSRF vulnerability in request body
    
    if product_id not in inventory or size not in inventory[product_id]:
        return jsonify({'error': 'Product not found'}), 404
    
    current_stock = inventory[product_id][size]
    
    if current_stock < quantity_to_buy:
        return jsonify({
            'error': 'Insufficient stock',
            'available': current_stock,
            'requested': quantity_to_buy
        }), 400
    
    # Decrease inventory
    inventory[product_id][size] -= quantity_to_buy
    new_stock = inventory[product_id][size]
    
    # VULNERABLE: Notify payment gateway callback after purchase
    # Realistic use case: Thông báo đến payment gateway sau khi inventory đã trừ
    if callback_url:
        try:
            print(f"[SSRF VULNERABILITY] Purchase callback to: {callback_url}")
            
            purchase_data = {
                'event': 'inventory.reduced',
                'product_id': product_id,
                'size': size,
                'quantity_purchased': quantity_to_buy,
                'remaining_stock': new_stock
            }
            
            # VULNERABLE: GET request to user-provided URL without validation
            # Attacker có thể scan internal network, access internal services
            response = requests.get(callback_url, timeout=5)
            print(f"[SSRF VULNERABILITY] Purchase callback response: {response.status_code}")
            
        except Exception as e:
            print(f"[SSRF VULNERABILITY] Purchase callback error: {str(e)}")
    
    return jsonify({
        'success': True,
        'product_id': product_id,
        'size': size,
        'quantity_purchased': quantity_to_buy,
        'new_quantity': new_stock,
        'message': 'Purchase successful'
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8083))
    app.run(host='0.0.0.0', port=port, debug=True)
