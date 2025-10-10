import requests
import json

# API URLs
USER_API = "http://localhost:8081/api"
PRODUCT_API = "http://localhost:8082/api"

def create_admin_user():
    """Tạo tài khoản admin"""
    print("🔐 Tạo tài khoản admin...")
    data = {
        "username": "admin",
        "password": "admin123",
        "email": "admin@example.com",
        "role": "ADMIN"
    }
    try:
        response = requests.post(f"{USER_API}/auth/register", json=data)
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"✅ Tạo admin thành công: {result['username']}")
            return result['token']
        else:
            print(f"⚠️  Admin có thể đã tồn tại")
            # Try login
            login_data = {"username": "admin", "password": "admin123"}
            response = requests.post(f"{USER_API}/auth/login", json=login_data)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Đăng nhập admin thành công")
                return result['token']
    except Exception as e:
        print(f"❌ Lỗi tạo admin: {e}")
    return None

def create_test_users():
    """Tạo users để test"""
    print("\n👥 Tạo test users...")
    users = [
        {"username": "user1", "password": "user123", "email": "user1@example.com", "role": "USER"},
        {"username": "user2", "password": "user123", "email": "user2@example.com", "role": "USER"},
        {"username": "user3", "password": "user123", "email": "user3@example.com", "role": "USER"},
    ]
    
    for user in users:
        try:
            response = requests.post(f"{USER_API}/auth/register", json=user)
            if response.status_code in [200, 201]:
                print(f"✅ Tạo user: {user['username']}")
            else:
                print(f"⚠️  User {user['username']} có thể đã tồn tại")
        except Exception as e:
            print(f"❌ Lỗi tạo user {user['username']}: {e}")

def create_products():
    """Tạo sản phẩm mẫu"""
    print("\n🛍️  Tạo sản phẩm mẫu...")
    
    products = [
        {
            "name": "Premium Cotton T-Shirt",
            "description": "High-quality 100% cotton t-shirt. Comfortable and durable. Perfect for everyday wear.",
            "price": "29.99",
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
            "sizes": [
                {"size": "S", "quantity": 15},
                {"size": "M", "quantity": 25},
                {"size": "L", "quantity": 20},
                {"size": "XL", "quantity": 10}
            ]
        },
        {
            "name": "Classic Blue Jeans",
            "description": "Stylish and comfortable blue jeans. Premium denim fabric with perfect fit.",
            "price": "59.99",
            "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
            "sizes": [
                {"size": "S", "quantity": 12},
                {"size": "M", "quantity": 20},
                {"size": "L", "quantity": 18},
                {"size": "XL", "quantity": 8}
            ]
        },
        {
            "name": "Sport Running Shoes",
            "description": "Lightweight running shoes with excellent cushioning. Perfect for your daily run.",
            "price": "89.99",
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
            "sizes": [
                {"size": "S", "quantity": 10},
                {"size": "M", "quantity": 15},
                {"size": "L", "quantity": 12},
                {"size": "XL", "quantity": 5}
            ]
        },
        {
            "name": "Casual Hoodie",
            "description": "Warm and comfortable hoodie. Perfect for casual wear in cold weather.",
            "price": "49.99",
            "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400",
            "sizes": [
                {"size": "S", "quantity": 8},
                {"size": "M", "quantity": 16},
                {"size": "L", "quantity": 14},
                {"size": "XL", "quantity": 12}
            ]
        },
        {
            "name": "Summer Dress",
            "description": "Light and elegant summer dress. Beautiful floral pattern and comfortable fabric.",
            "price": "69.99",
            "image_url": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400",
            "sizes": [
                {"size": "S", "quantity": 10},
                {"size": "M", "quantity": 18},
                {"size": "L", "quantity": 15},
                {"size": "XL", "quantity": 7}
            ]
        },
        {
            "name": "Leather Jacket",
            "description": "Premium leather jacket with modern design. Durable and stylish.",
            "price": "149.99",
            "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400",
            "sizes": [
                {"size": "S", "quantity": 5},
                {"size": "M", "quantity": 12},
                {"size": "L", "quantity": 10},
                {"size": "XL", "quantity": 6}
            ]
        }
    ]
    
    for product in products:
        try:
            response = requests.post(f"{PRODUCT_API}/products/", json=product)
            if response.status_code in [200, 201]:
                result = response.json()
                print(f"✅ Tạo sản phẩm: {product['name']} (ID: {result['id']})")
            else:
                print(f"❌ Lỗi tạo sản phẩm {product['name']}: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
        except Exception as e:
            print(f"❌ Lỗi tạo sản phẩm {product['name']}: {e}")

def main():
    print("=" * 60)
    print("🚀 BẮT ĐẦU SEED DỮ LIỆU CHO MICROSERVICE SHOP")
    print("=" * 60)
    
    # Tạo admin
    admin_token = create_admin_user()
    
    # Tạo test users
    create_test_users()
    
    # Tạo products
    create_products()
    
    print("\n" + "=" * 60)
    print("✅ HOÀN TẤT SEED DỮ LIỆU!")
    print("=" * 60)
    print("\n📝 Thông tin đăng nhập:")
    print("   Admin:")
    print("     - Username: admin")
    print("     - Password: admin123")
    print("\n   Test Users:")
    print("     - Username: user1, user2, user3")
    print("     - Password: user123")
    print("\n🌐 Truy cập: http://localhost:3000")
    print("\n⚠️  Để test SSRF vulnerability:")
    print("   1. Vào chi tiết sản phẩm")
    print("   2. Chọn size")
    print("   3. Nhập callback URL: http://user-service:8081/api/users/delete/2")
    print("   4. Click 'Trigger SSRF Attack'")
    print("=" * 60)

if __name__ == "__main__":
    main()
