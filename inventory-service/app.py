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
    'postgresql://inventoryservice:password123@postgres-inventory:5432/inventoryservice_db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Product Service URL for initial sync
PRODUCT_SERVICE_URL = os.getenv('PRODUCT_SERVICE_URL', 'http://product-service:8082')


# Database Model
class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, nullable=False, index=True)
    size = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('product_id', 'size', name='uix_product_size'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'size': self.size,
            'quantity': self.quantity,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# Create tables and sync initial data
with app.app_context():
    try:
        db.create_all()
        print("[INVENTORY_SERVICE] Database tables created/verified")
    except Exception as e:
        print(f"[INVENTORY_SERVICE] Database tables already exist or error: {str(e)}")
    
    # Sync initial data from product-service if inventory is empty
    try:
        inventory_count = Inventory.query.count()
        print(f"[INVENTORY_SERVICE] Current inventory count: {inventory_count}")
        
        if inventory_count == 0:
            print("[INVENTORY_SERVICE] Syncing initial data from product-service...")
            try:
                response = requests.get(f'{PRODUCT_SERVICE_URL}/api/products/', timeout=10)
                if response.ok:
                    products = response.json()
                    for product in products:
                        product_id = product['id']
                        sizes = product.get('sizes', [])
                        
                        for size_obj in sizes:
                            inventory_item = Inventory(
                                product_id=product_id,
                                size=size_obj['size'],
                                quantity=size_obj['quantity']
                            )
                            db.session.add(inventory_item)
                    
                    db.session.commit()
                    print(f"[INVENTORY_SERVICE] ✅ SYNC SUCCESS: Synced {Inventory.query.count()} inventory records")
                else:
                    print(f"[INVENTORY_SERVICE] Failed to sync from product-service: {response.status_code}")
            except Exception as e:
                db.session.rollback()
                print(f"[INVENTORY_SERVICE] Error syncing initial data: {str(e)}")
        else:
            print(f"[INVENTORY_SERVICE] ✅ Database already has {inventory_count} inventory records, skipping sync")
    except Exception as e:
        print(f"[INVENTORY_SERVICE] Error checking inventory count: {str(e)}")


def get_inventory_dict(product_id):
    """
    Get inventory for a product from database
    Returns dict format: {"S": 10, "M": 15, ...}
    """
    inventory_items = Inventory.query.filter_by(product_id=product_id).all()
    
    inventory_dict = {}
    for item in inventory_items:
        inventory_dict[item.size] = item.quantity
    
    return inventory_dict


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'inventory_count': Inventory.query.count()}), 200


@app.route('/api/inventory/sync', methods=['POST'])
def sync_from_product_service():
    """
    Sync inventory data from product-service
    Can be called manually or scheduled
    """
    try:
        print("[SYNC] Starting sync from product-service...")
        response = requests.get(f'{PRODUCT_SERVICE_URL}/api/products/', timeout=10)
        
        if not response.ok:
            return jsonify({
                'error': 'Failed to fetch products from product-service',
                'status_code': response.status_code
            }), 400
        
        products = response.json()
        synced_count = 0
        
        for product in products:
            product_id = product['id']
            sizes = product.get('sizes', [])
            
            for size_obj in sizes:
                size = size_obj['size']
                quantity = size_obj['quantity']
                
                # Find or create inventory record
                inventory_item = Inventory.query.filter_by(product_id=product_id, size=size).first()
                
                if inventory_item:
                    # Update existing
                    inventory_item.quantity = quantity
                    inventory_item.updated_at = datetime.utcnow()
                else:
                    # Create new
                    inventory_item = Inventory(
                        product_id=product_id,
                        size=size,
                        quantity=quantity
                    )
                    db.session.add(inventory_item)
                
                synced_count += 1
        
        db.session.commit()
        print(f"[SYNC] Synced {synced_count} inventory records")
        
        return jsonify({
            'success': True,
            'message': f'Synced {synced_count} inventory records',
            'total_inventory': Inventory.query.count()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"[SYNC] Error: {str(e)}")
        return jsonify({
            'error': 'Sync failed',
            'details': str(e)
        }), 500


@app.route('/api/inventory/<int:product_id>/<size>', methods=['GET'])
def get_inventory(product_id, size):
    """
    Get inventory for a specific product and size from database
    """
    inventory_item = Inventory.query.filter_by(product_id=product_id, size=size).first()
    
    if inventory_item:
        return jsonify({
            'product_id': product_id,
            'size': size,
            'quantity': inventory_item.quantity,
            'available': inventory_item.quantity > 0
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
    """
    Get all inventory for a product from database
    """
    inventory_dict = get_inventory_dict(product_id)
    
    if inventory_dict:
        return jsonify({
            'product_id': product_id,
            'inventory': inventory_dict
        }), 200
    else:
        return jsonify({
            'product_id': product_id,
            'inventory': {}
        }), 404


@app.route('/api/inventory/<int:product_id>/<size>', methods=['PUT'])
def update_inventory(product_id, size):
    """
    Update inventory for a specific product and size in database
    Supports two modes:
    - set: Set absolute quantity (for admin)
    - add: Add to current quantity (for order cancellation)
    """
    data = request.get_json()
    quantity = data.get('quantity', 0)
    mode = data.get('mode', 'set')  # 'set' or 'add'
    
    try:
        # Find or create inventory record
        inventory_item = Inventory.query.filter_by(product_id=product_id, size=size).first()
        
        if not inventory_item:
            # Create new record
            inventory_item = Inventory(
                product_id=product_id,
                size=size,
                quantity=quantity if mode == 'set' else 0 + quantity
            )
            db.session.add(inventory_item)
        else:
            # Update existing record
            if mode == 'add':
                inventory_item.quantity += quantity
            else:
                inventory_item.quantity = quantity
            
            inventory_item.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        print(f"[INVENTORY_UPDATE] Product {product_id} size {size}: quantity={inventory_item.quantity} (mode={mode})")
        
        return jsonify({
            'product_id': product_id,
            'size': size,
            'quantity': inventory_item.quantity,
            'mode': mode,
            'message': 'Inventory updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"[INVENTORY_UPDATE] Error: {str(e)}")
        return jsonify({
            'error': 'Failed to update inventory',
            'details': str(e)
        }), 500


@app.route('/api/inventory/purchase', methods=['POST'])
def purchase_product():
    """
    Purchase product - decrease inventory in database
    """
    data = request.get_json()
    product_id = data.get('product_id')
    size = data.get('size')
    quantity_to_buy = data.get('quantity', 1)
    
    try:
        # Find inventory record
        inventory_item = Inventory.query.filter_by(product_id=product_id, size=size).first()
        
        if not inventory_item:
            return jsonify({'error': 'Product not found'}), 404
        
        current_stock = inventory_item.quantity
        
        if current_stock < quantity_to_buy:
            return jsonify({
                'error': 'Insufficient stock',
                'available': current_stock,
                'requested': quantity_to_buy
            }), 400
        
        # Decrease inventory
        inventory_item.quantity -= quantity_to_buy
        inventory_item.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        print(f"[PURCHASE] Product {product_id} size {size}: {current_stock} -> {inventory_item.quantity}")
        
        return jsonify({
            'success': True,
            'product_id': product_id,
            'size': size,
            'quantity_purchased': quantity_to_buy,
            'new_quantity': inventory_item.quantity,
            'message': 'Purchase successful'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"[PURCHASE] Error: {str(e)}")
        return jsonify({
            'error': 'Failed to purchase',
            'details': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8083))
    app.run(host='0.0.0.0', port=port, debug=True)
