# Generated by Django 5.1.4 on 2025-02-08 17:57

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0007_alter_folder_unique_together_and_more'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='folder',
            unique_together=set(),
        ),
        migrations.AlterUniqueTogether(
            name='uploadedfile',
            unique_together=set(),
        ),
    ]
