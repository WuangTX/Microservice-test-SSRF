from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.URLField(max_length=500, blank=True)
    
    # SSRF Vulnerable Fields - URLs stored in database
    price_comparison_url = models.URLField(max_length=500, blank=True, null=True, 
                                          help_text="URL to compare prices from competitor website")
    external_review_url = models.URLField(max_length=500, blank=True, null=True,
                                         help_text="URL to fetch external product reviews")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']


class ProductSize(models.Model):
    SIZE_CHOICES = [
        ('S', 'Small'),
        ('M', 'Medium'),
        ('L', 'Large'),
        ('XL', 'Extra Large'),
    ]

    product = models.ForeignKey(Product, related_name='sizes', on_delete=models.CASCADE)
    size = models.CharField(max_length=10, choices=SIZE_CHOICES)
    quantity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.size}"

    class Meta:
        db_table = 'product_sizes'
        unique_together = ('product', 'size')
