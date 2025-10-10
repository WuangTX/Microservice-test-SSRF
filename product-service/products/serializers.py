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
        fields = ['id', 'name', 'description', 'price', 'image_url', 'sizes', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    sizes = ProductSizeSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image_url', 'sizes']

    def create(self, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        product = Product.objects.create(**validated_data)
        
        for size_data in sizes_data:
            ProductSize.objects.create(product=product, **size_data)
        
        return product

    def update(self, instance, validated_data):
        sizes_data = validated_data.pop('sizes', [])
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.price = validated_data.get('price', instance.price)
        instance.image_url = validated_data.get('image_url', instance.image_url)
        instance.save()

        # Update sizes
        if sizes_data:
            instance.sizes.all().delete()
            for size_data in sizes_data:
                ProductSize.objects.create(product=instance, **size_data)
        
        return instance
