from django.db import models


# Create your models here.
class Person(models.Model):
    first_name = models.CharField(max_length=35)
    last_name = models.CharField(max_length=35)
    email = models.EmailField(max_length=50, unique=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
