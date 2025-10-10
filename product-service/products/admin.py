from django.contrib import admin
from django.utils.html import format_html
from .models import Product, ProductSize


class ProductSizeInline(admin.TabularInline):
    """
    Inline admin for ProductSize - allows editing sizes within Product admin
    """
    model = ProductSize
    extra = 1
    fields = ['size', 'quantity']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """
    Enhanced Product admin with search, filters, and inline sizes
    """
    list_display = ['id', 'name', 'display_price', 'total_sizes', 'display_image', 'created_at']
    list_display_links = ['id', 'name']
    search_fields = ['name', 'description']
    list_filter = ['created_at', 'updated_at']
    readonly_fields = ['created_at', 'updated_at', 'preview_image']
    ordering = ['-created_at']
    list_per_page = 20
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'price')
        }),
        ('Image', {
            'fields': ('image_url', 'preview_image'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ProductSizeInline]
    
    def display_price(self, obj):
        """Display price with currency symbol"""
        return format_html('<strong>${:,.2f}</strong>', obj.price)
    display_price.short_description = 'Price'
    display_price.admin_order_field = 'price'
    
    def total_sizes(self, obj):
        """Display total number of available sizes"""
        count = obj.sizes.count()
        if count > 0:
            return format_html('<span style="color: green;">✓ {} sizes</span>', count)
        return format_html('<span style="color: red;">✗ No sizes</span>')
    total_sizes.short_description = 'Sizes'
    
    def display_image(self, obj):
        """Display small thumbnail in list view"""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" />',
                obj.image_url
            )
        return format_html('<span style="color: gray;">No image</span>')
    display_image.short_description = 'Image'
    
    def preview_image(self, obj):
        """Display larger image in detail view"""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 10px;" />',
                obj.image_url
            )
        return format_html('<span style="color: gray;">No image available</span>')
    preview_image.short_description = 'Image Preview'


@admin.register(ProductSize)
class ProductSizeAdmin(admin.ModelAdmin):
    """
    Enhanced ProductSize admin with filters and custom display
    """
    list_display = ['id', 'product', 'size', 'display_quantity', 'availability_status']
    list_display_links = ['id', 'product']
    list_filter = ['size', 'product']
    search_fields = ['product__name']
    ordering = ['product', 'size']
    list_per_page = 20
    
    def display_quantity(self, obj):
        """Display quantity with color coding"""
        if obj.quantity > 10:
            color = 'green'
            icon = '✓'
        elif obj.quantity > 0:
            color = 'orange'
            icon = '⚠'
        else:
            color = 'red'
            icon = '✗'
        
        return format_html(
            '<span style="color: {};">{} {} units</span>',
            color, icon, obj.quantity
        )
    display_quantity.short_description = 'Quantity'
    display_quantity.admin_order_field = 'quantity'
    
    def availability_status(self, obj):
        """Display availability status"""
        if obj.quantity > 0:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; border-radius: 3px;">In Stock</span>'
            )
        return format_html(
            '<span style="background-color: #dc3545; color: white; padding: 3px 8px; border-radius: 3px;">Out of Stock</span>'
        )
    availability_status.short_description = 'Status'


# Customize admin site headers
admin.site.site_header = "Product Service Admin"
admin.site.site_title = "Product Admin"
admin.site.index_title = "Welcome to Product Management"
