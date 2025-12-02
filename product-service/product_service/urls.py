from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
   openapi.Info(
      title="Product Service API - SSRF Vulnerable Lab",
      default_version='v1.0',
      description="""
      **⚠️ WARNING: This API contains intentional SSRF vulnerabilities for educational purposes**
      
      ## Vulnerable Endpoints:
      
      ### 1. Price Comparison (SSRF)
      - `GET/POST /api/products/{id}/check_price/`
      - Parameter: `compare_url` (accepts any URL)
      - Vulnerability: Server fetches user-provided URL without validation
      
      ### 2. Review Fetcher (SSRF)  
      - `GET/POST /api/products/{id}/fetch_review/`
      - Parameter: `review_url` (accepts any URL)
      - Vulnerability: Server fetches and parses external content
      
      ### 3. Social Media Sharing (SSRF with POST)
      - `GET/POST /api/products/{id}/share/`
      - Parameter: `share_api_url` (accepts any URL)
      - Vulnerability: Server POSTs product data to arbitrary URL
      
      ## Testing Tips:
      - Try internal URLs: `http://user-service:8081/api/users`
      - Try localhost: `http://127.0.0.1:8081`
      - Try metadata endpoints: `http://169.254.169.254/latest/meta-data/`
      - Use webhook.site for out-of-band detection
      
      ## API Gateway Protection:
      This service is behind an API Gateway with SSRF protection filter.
      Gateway blocks query parameters, but check if POST body is filtered!
      """,
      terms_of_service="https://quangtx.io.vn/terms/",
      contact=openapi.Contact(email="quang@quangtx.io.vn"),
      license=openapi.License(name="Educational Use Only"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('products.urls')),
    
    # Swagger UI endpoints
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('docs/', schema_view.with_ui('swagger', cache_timeout=0), name='api-docs'),
]
