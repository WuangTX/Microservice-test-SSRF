from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, ProductSize
from .serializers import ProductSerializer, ProductCreateSerializer, ProductSizeSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductSerializer

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
