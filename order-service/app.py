from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import requests
import os

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    'postgresql://orderservice:password123@postgres-order:5432/orderservice_db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Service URLs
USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user-service:8081')
PRODUCT_SERVICE_URL = os.getenv('PRODUCT_SERVICE_URL', 'http://product-service:8082')
INVENTORY_SERVICE_URL = os.getenv('INVENTORY_SERVICE_URL', 'http://inventory-service:8083')


# Models
class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    size = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, confirmed, shipped, delivered, cancelled
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Cached data from other services (for performance)
    user_email = db.Column(db.String(255))
    product_name = db.Column(db.String(255))
    product_price = db.Column(db.Float)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'product_price': self.product_price,
            'size': self.size,
            'quantity': self.quantity,
            'total_price': self.total_price,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Create tables
with app.app_context():
    db.create_all()
    print("[ORDER_SERVICE] Database tables created")


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'order-service'}), 200


@app.route('/api/orders', methods=['POST'])
def create_order():
    """
    Create new order with inter-service calls
    Calls: User Service (verify user), Product Service (get price), Inventory Service (check & decrease stock)
    """
    data = request.get_json()
    
    # Validate input
    user_id = data.get('user_id')
    product_id = data.get('product_id')
    size = data.get('size')
    quantity = data.get('quantity', 1)
    
    if not all([user_id, product_id, size]):
        return jsonify({'error': 'user_id, product_id, and size are required'}), 400
    
    try:
        # 🔥 STEP 1: Verify user exists (call user-service)
        print(f"[CREATE_ORDER] Step 1: Verifying user {user_id} via user-service")
        user_response = requests.get(
            f'{USER_SERVICE_URL}/api/users/{user_id}',
            timeout=5
        )
        
        if not user_response.ok:
            return jsonify({
                'error': 'User not found or user service unavailable',
                'details': user_response.text[:200]
            }), 400
        
        user_data = user_response.json()
        user_email = user_data.get('email', 'unknown@email.com')
        print(f"[CREATE_ORDER] ✅ User verified: {user_email}")
        
        # 🔥 STEP 2: Get product details (call product-service)
        print(f"[CREATE_ORDER] Step 2: Getting product {product_id} details via product-service")
        product_response = requests.get(
            f'{PRODUCT_SERVICE_URL}/api/products/{product_id}/',
            timeout=5
        )
        
        if not product_response.ok:
            return jsonify({
                'error': 'Product not found or product service unavailable',
                'details': product_response.text[:200]
            }), 400
        
        product_data = product_response.json()
        product_name = product_data.get('name', 'Unknown Product')
        product_price = float(product_data.get('price', 0))
        print(f"[CREATE_ORDER] ✅ Product found: {product_name} - {product_price} VND")
        
        # 🔥 STEP 3: Check inventory availability (call inventory-service)
        print(f"[CREATE_ORDER] Step 3: Checking inventory for product {product_id} size {size}")
        inventory_response = requests.get(
            f'{INVENTORY_SERVICE_URL}/api/inventory/{product_id}/{size}',
            timeout=5
        )
        
        if not inventory_response.ok:
            return jsonify({
                'error': 'Inventory check failed',
                'details': inventory_response.text[:200]
            }), 400
        
        inventory_data = inventory_response.json()
        available_quantity = inventory_data.get('quantity', 0)
        
        if available_quantity < quantity:
            return jsonify({
                'error': 'Insufficient stock',
                'available': available_quantity,
                'requested': quantity
            }), 400
        
        print(f"[CREATE_ORDER] ✅ Inventory available: {available_quantity} >= {quantity}")
        
        # 🔥 STEP 4: Decrease inventory (call inventory-service)
        print(f"[CREATE_ORDER] Step 4: Decreasing inventory")
        purchase_response = requests.post(
            f'{INVENTORY_SERVICE_URL}/api/inventory/purchase',
            json={
                'product_id': product_id,
                'size': size,
                'quantity': quantity
            },
            timeout=5
        )
        
        if not purchase_response.ok:
            return jsonify({
                'error': 'Failed to update inventory',
                'details': purchase_response.text[:200]
            }), 400
        
        print(f"[CREATE_ORDER] ✅ Inventory decreased successfully")
        
        # 🔥 STEP 5: Create order in database
        total_price = product_price * quantity
        
        new_order = Order(
            user_id=user_id,
            user_email=user_email,
            product_id=product_id,
            product_name=product_name,
            product_price=product_price,
            size=size,
            quantity=quantity,
            total_price=total_price,
            status='confirmed'
        )
        
        db.session.add(new_order)
        db.session.commit()
        
        print(f"[CREATE_ORDER] ✅ Order #{new_order.id} created successfully")
        
        return jsonify({
            'success': True,
            'message': 'Đặt hàng thành công!',
            'order': new_order.to_dict()
        }), 201
        
    except requests.exceptions.Timeout as e:
        return jsonify({
            'error': 'Service timeout - one of the services is not responding',
            'details': str(e)
        }), 503
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': 'Failed to communicate with other services',
            'details': str(e)
        }), 503
    except Exception as e:
        db.session.rollback()
        print(f"[CREATE_ORDER] ❌ Error: {str(e)}")
        return jsonify({
            'error': 'Failed to create order',
            'details': str(e)
        }), 500


@app.route('/api/orders', methods=['GET'])
def get_orders():
    """
    Get all orders (optionally filter by user_id)
    """
    user_id = request.args.get('user_id', type=int)
    
    query = Order.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    orders = query.order_by(Order.created_at.desc()).all()
    
    return jsonify({
        'orders': [order.to_dict() for order in orders],
        'count': len(orders)
    }), 200


@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order_detail(order_id):
    """
    Get order detail with fresh data from other services
    """
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    order_data = order.to_dict()
    
    # 🔥 Optionally fetch fresh product data
    try:
        product_response = requests.get(
            f'{PRODUCT_SERVICE_URL}/api/products/{order.product_id}/',
            timeout=3
        )
        if product_response.ok:
            fresh_product_data = product_response.json()
            order_data['fresh_product_data'] = fresh_product_data
            print(f"[ORDER_DETAIL] Got fresh product data for order {order_id}")
    except Exception as e:
        print(f"[ORDER_DETAIL] Could not fetch fresh product data: {str(e)}")
    
    return jsonify(order_data), 200


@app.route('/api/orders/<int:order_id>', methods=['PATCH'])
def update_order_status(order_id):
    """
    Update order status (for admin)
    """
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    data = request.get_json()
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'status is required'}), 400
    
    valid_statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
    
    order.status = new_status
    order.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Order status updated',
        'order': order.to_dict()
    }), 200


@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def cancel_order(order_id):
    """
    Cancel order and restore inventory
    """
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    if order.status in ['shipped', 'delivered']:
        return jsonify({'error': 'Cannot cancel order that is already shipped or delivered'}), 400
    
    try:
        # 🔥 Restore inventory (call inventory-service with mode='add')
        print(f"[CANCEL_ORDER] Restoring inventory for order {order_id}: +{order.quantity} to product {order.product_id} size {order.size}")
        restore_response = requests.put(
            f'{INVENTORY_SERVICE_URL}/api/inventory/{order.product_id}/{order.size}',
            json={'quantity': order.quantity, 'mode': 'add'},  # ADD to current stock
            timeout=5
        )
        
        if restore_response.ok:
            print(f"[CANCEL_ORDER] ✅ Inventory restored")
        
        # Update order status
        order.status = 'cancelled'
        order.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Order cancelled and inventory restored',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        print(f"[CANCEL_ORDER] ❌ Error: {str(e)}")
        return jsonify({
            'error': 'Failed to cancel order',
            'details': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8084))
    app.run(host='0.0.0.0', port=port, debug=True)
