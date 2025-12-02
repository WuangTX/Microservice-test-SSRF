"""
SSRF VULNERABLE ENDPOINTS - Thực tế cho E-Commerce
Dễ phát hiện bằng Black Box Scanner
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import requests
import json
import time


@api_view(['GET'])
@permission_classes([AllowAny])
def check_shipping_status(request):
    """
    SSRF VULNERABILITY #1: Kiểm tra trạng thái vận chuyển
    
    BLACK BOX DETECTION: CỰC KỲ DỄ (95%)
    - Endpoint: /api/shipping/track
    - Parameter: tracking_url (rõ ràng)
    - GET method
    - Public endpoint (không cần auth)
    
    USE CASE (REALISTIC):
    - Khách hàng nhập link tracking từ đơn vị vận chuyển (GHN, Viettel Post, etc)
    - Ví dụ: "Nhập link tracking: https://ghn.vn/track/GHN123456"
    - Server fetch thông tin vận chuyển và hiển thị cho user
    
    EXPLOIT:
    GET /api/shipping/track?tracking_url=http://localhost:8081/api/users
    GET /api/shipping/track?tracking_url=http://169.254.169.254/latest/meta-data/
    """
    tracking_url = request.query_params.get('tracking_url') or request.query_params.get('url')
    order_id = request.query_params.get('order_id', 'ORD-12345')
    
    if not tracking_url:
        return Response({
            'error': 'tracking_url is required',
            'usage': 'GET /api/shipping/track?tracking_url=https://ghn.vn/track/GHN123456',
            'description': 'Nhập link tracking từ đơn vị vận chuyển để kiểm tra trạng thái đơn hàng'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        print(f"[SHIPPING] Tracking order from: {tracking_url}")
        
        # SSRF: Fetch tracking info from external shipping provider
        response = requests.get(
            tracking_url,
            timeout=10,
            headers={
                'User-Agent': 'ShopTracking/1.0',
                'Accept': 'application/json, text/html'
            }
        )
        
        return Response({
            'success': True,
            'order_id': order_id,
            'tracking_url': tracking_url,
            'shipping_status': 'Đang vận chuyển',
            'status_code': response.status_code,
            'tracking_info': response.text[:800],  # Return content để exfiltrate data
            'last_update': time.strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        return Response({
            'error': f'Không thể tra cứu đơn hàng: {str(e)}',
            'tracking_url': tracking_url,
            'suggestion': 'Vui lòng kiểm tra lại link tracking'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def verify_supplier_product(request):
    """
    SSRF VULNERABILITY #2: Xác thực sản phẩm từ nhà cung cấp
    
    BLACK BOX DETECTION: DỄ (90%)
    - Endpoint: /api/products/verify-supplier
    - Parameter: supplier_url (chuẩn)
    - Accept cả GET và POST
    
    USE CASE:
    - Admin/User kiểm tra sản phẩm có tồn tại ở nhà cung cấp không
    - "Xác minh sản phẩm này từ: https://supplier.com/product/123"
    - Chống hàng fake bằng cách verify từ manufacturer website
    
    EXPLOIT:
    GET /api/products/verify-supplier?supplier_url=http://user-service:8080/api/users
    POST /api/products/verify-supplier {"supplier_url": "http://localhost:8082/admin"}
    """
    supplier_url = request.query_params.get('supplier_url') or request.data.get('supplier_url')
    product_id = request.query_params.get('product_id') or request.data.get('product_id', 1)
    
    if not supplier_url:
        return Response({
            'error': 'supplier_url is required',
            'usage': 'GET /api/products/verify-supplier?supplier_url=https://nike.com/product/air-max-123',
            'description': 'Xác minh sản phẩm có chính hãng từ nhà cung cấp'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        print(f"[VERIFY_SUPPLIER] Checking product from: {supplier_url}")
        
        # SSRF: GET request to supplier website
        response = requests.get(
            supplier_url,
            timeout=10,
            headers={
                'User-Agent': 'ProductVerification/1.0',
                'Accept': 'application/json, text/html'
            }
        )
        
        # Check if product info exists in response
        is_verified = response.status_code == 200
        
        return Response({
            'product_id': product_id,
            'supplier_url': supplier_url,
            'verified': is_verified,
            'verification_status': 'Sản phẩm chính hãng' if is_verified else 'Không tìm thấy sản phẩm',
            'supplier_response_code': response.status_code,
            'supplier_data': response.text[:600],  # Data exfiltration
            'content_type': response.headers.get('Content-Type'),
            'checked_at': time.strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        return Response({
            'error': f'Lỗi khi xác minh sản phẩm: {str(e)}',
            'supplier_url': supplier_url
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_warranty_status(request):
    """
    SSRF VULNERABILITY #3: Kiểm tra bảo hành
    
    BLACK BOX DETECTION: RẤT DỄ (92%)
    - Endpoint: /api/warranty/check
    - Parameter: warranty_url (rõ ràng)
    - GET method
    
    USE CASE:
    - Khách hàng kiểm tra bảo hành qua link từ hãng
    - "Nhập link kiểm tra bảo hành: https://samsung.com/warranty/check?sn=ABC123"
    - Common cho điện tử, đồ công nghệ
    
    EXPLOIT:
    GET /api/warranty/check?warranty_url=http://inventory-service:5001/api/inventory
    """
    warranty_url = request.query_params.get('warranty_url') or request.query_params.get('url')
    serial_number = request.query_params.get('serial', 'SN-123456')
    
    if not warranty_url:
        return Response({
            'error': 'warranty_url is required',
            'usage': 'GET /api/warranty/check?warranty_url=https://samsung.com/warranty/ABC123',
            'description': 'Nhập link kiểm tra bảo hành từ nhà sản xuất'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        print(f"[WARRANTY] Checking warranty: {warranty_url}")
        
        # SSRF: GET warranty info
        response = requests.get(
            warranty_url,
            timeout=10,
            headers={'User-Agent': 'WarrantyCheck/1.0'}
        )
        
        return Response({
            'serial_number': serial_number,
            'warranty_url': warranty_url,
            'warranty_status': 'Còn bảo hành' if response.status_code == 200 else 'Hết bảo hành',
            'expiry_date': '2025-12-31',
            'warranty_info': response.text[:500],
            'status_code': response.status_code
        })
        
    except Exception as e:
        return Response({
            'error': f'Không thể kiểm tra bảo hành: {str(e)}',
            'warranty_url': warranty_url
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def load_product_image(request):
    """
    SSRF VULNERABILITY #4: Load ảnh sản phẩm từ URL
    
    BLACK BOX DETECTION: DỄ (88%)
    - Endpoint: /api/products/load-image
    - Parameter: image_url (rất phổ biến)
    - Accept cả GET và POST
    
    USE CASE:
    - Admin thêm sản phẩm mới, paste link ảnh từ nguồn khác
    - "Nhập URL ảnh sản phẩm: https://cdn.example.com/product.jpg"
    - System fetch và validate ảnh trước khi save
    
    EXPLOIT:
    GET /api/products/load-image?image_url=http://localhost:8081/api/users
    POST /api/products/load-image {"image_url": "http://169.254.169.254/"}
    """
    image_url = request.query_params.get('image_url') or request.data.get('image_url')
    product_id = request.query_params.get('product_id') or request.data.get('product_id', 1)
    
    if not image_url:
        return Response({
            'error': 'image_url is required',
            'usage': 'GET /api/products/load-image?image_url=https://cdn.example.com/product.jpg',
            'description': 'Load và validate ảnh sản phẩm từ URL'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        print(f"[IMAGE_LOAD] Loading image from: {image_url}")
        
        # SSRF: Fetch image from URL
        response = requests.get(
            image_url,
            timeout=10,
            headers={'User-Agent': 'ImageLoader/1.0'}
        )
        
        content_type = response.headers.get('Content-Type', '')
        is_valid_image = 'image' in content_type or response.status_code == 200
        
        return Response({
            'product_id': product_id,
            'image_url': image_url,
            'valid': is_valid_image,
            'status_code': response.status_code,
            'content_type': content_type,
            'size_bytes': len(response.content),
            'message': 'Ảnh hợp lệ, đã load thành công' if is_valid_image else 'URL không phải ảnh',
            'preview_data': response.text[:400] if not is_valid_image else 'Binary image data'
        })
        
    except Exception as e:
        return Response({
            'error': f'Không thể load ảnh: {str(e)}',
            'image_url': image_url
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def notify_restock(request):
    """
    SSRF VULNERABILITY #5: Thông báo khi có hàng trở lại
    
    BLACK BOX DETECTION: TRUNG BÌNH (75%)
    - Endpoint: /api/products/notify-restock
    - Parameter: notification_endpoint
    - POST method
    
    USE CASE:
    - User đăng ký nhận thông báo khi sản phẩm hết hàng có lại
    - "Thông báo đến app của tôi: https://myapp.com/api/notify"
    - Hoặc webhook đến Discord/Telegram
    
    EXPLOIT:
    POST /api/products/notify-restock
    {"notification_endpoint": "http://user-service:8080/api/users/delete/1"}
    """
    notification_endpoint = request.data.get('notification_endpoint') or request.data.get('notify_url')
    product_id = request.data.get('product_id', 1)
    email = request.data.get('email', 'customer@example.com')
    
    if not notification_endpoint:
        return Response({
            'error': 'notification_endpoint is required',
            'example': {
                'product_id': 1,
                'email': 'customer@example.com',
                'notification_endpoint': 'https://discord.com/api/webhooks/...'
            },
            'description': 'Đăng ký nhận thông báo khi sản phẩm có hàng trở lại'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        print(f"[RESTOCK_NOTIFY] Sending notification to: {notification_endpoint}")
        
        notification_data = {
            'event': 'restock',
            'product_id': product_id,
            'product_name': 'Nike Air Max',
            'price': 120,
            'stock': 10,
            'message': f'Sản phẩm #{product_id} đã có hàng trở lại!',
            'customer_email': email
        }
        
        # SSRF: POST notification
        response = requests.post(
            notification_endpoint,
            json=notification_data,
            timeout=10,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'RestockNotifier/1.0'
            }
        )
        
        return Response({
            'success': True,
            'message': 'Đã đăng ký thông báo thành công',
            'product_id': product_id,
            'notification_endpoint': notification_endpoint,
            'response_status': response.status_code,
            'response_body': response.text[:300]
        })
        
    except Exception as e:
        return Response({
            'error': f'Không thể gửi thông báo: {str(e)}',
            'notification_endpoint': notification_endpoint
        }, status=status.HTTP_400_BAD_REQUEST)
