from rest_framework import serializers
from .models import Product, ProductSize


class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = ['id', 'size', 'quantity']


class ProductSerializer(serializers.ModelSerializer):
    sizes = ProductSizeSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image_url', 'sizes', 
                  'price_comparison_url', 'external_review_url',
                  'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    sizes = ProductSizeSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image_url', 'sizes',
                  'price_comparison_url', 'external_review_url']

    def create(self, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        product = Product.objects.create(**validated_data)
        
        for size_data in sizes_data:
            ProductSize.objects.create(product=product, **size_data)
        
        return product

    def update(self, instance, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        
        # Debug logging
        print(f"[DEBUG] Updating product {instance.id}")
        print(f"[DEBUG] Sizes data received: {sizes_data}")
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.price = validated_data.get('price', instance.price)
        instance.image_url = validated_data.get('image_url', instance.image_url)
        instance.price_comparison_url = validated_data.get('price_comparison_url', instance.price_comparison_url)
        instance.external_review_url = validated_data.get('external_review_url', instance.external_review_url)
        instance.save()

        # Update sizes - ALWAYS update sizes, even if empty list is provided
        # This ensures sizes are properly updated even when frontend sends empty or zero quantities
        instance.sizes.all().delete()
        for size_data in sizes_data:
            print(f"[DEBUG] Creating size: {size_data}")
            ProductSize.objects.create(product=instance, **size_data)
        
        return instance
