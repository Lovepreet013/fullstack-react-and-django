from django.db import models
from django.contrib.auth.models import AbstractUser


# Create your models here.
class User(AbstractUser):
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    auth0_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    auth_provider = models.CharField(
        max_length=20,
        default="email",
        choices=[("email", "Email"), ("auth0", "Auth0")],
    )
