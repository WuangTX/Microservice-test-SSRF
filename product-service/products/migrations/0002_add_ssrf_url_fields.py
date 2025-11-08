# Generated migration for adding SSRF vulnerable URL fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='price_comparison_url',
            field=models.URLField(blank=True, help_text='URL to compare prices from competitor website', max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='external_review_url',
            field=models.URLField(blank=True, help_text='URL to fetch external product reviews', max_length=500, null=True),
        ),
    ]
