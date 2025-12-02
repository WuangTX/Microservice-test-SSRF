from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet
from .webhook_views import (
    check_shipping_status,
    verify_supplier_product,
    check_warranty_status,
    load_product_image,
    notify_restock
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
    
    # SSRF Vulnerable E-Commerce Features - Dễ phát hiện với Black Box
    path('shipping/track/', check_shipping_status, name='shipping_track'),
    path('products/verify-supplier/', verify_supplier_product, name='verify_supplier'),
    path('warranty/check/', check_warranty_status, name='warranty_check'),
    path('products/load-image/', load_product_image, name='load_image'),
    path('products/notify-restock/', notify_restock, name='notify_restock'),
]
