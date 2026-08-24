from django.db import models
from django.conf import settings


# Create your models here.
class Person(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class Hobby(models.TextChoices):
        SPORTS = "sports", "Sports"
        DANCING = "dancing", "Dancing"
        PLAYING = "playing", "Playing"
        OTHERS = "others", "Others"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="persons"
    )

    first_name = models.CharField(max_length=35)
    last_name = models.CharField(max_length=35)
    email = models.EmailField(max_length=50, unique=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, default="other")
    hobbies = models.JSONField(default=list)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
