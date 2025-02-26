# Generated by Django 5.1.4 on 2025-02-05 17:25

import django.db.models.deletion
import resource.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0004_remove_category_name_remove_uploadedfile_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='name',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='category',
            field=models.ForeignKey(blank=True, default=resource.models.Category.get_default_category, null=True, on_delete=django.db.models.deletion.SET_NULL, to='resource.category'),
        ),
    ]
