from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()

# Custom User is auto-registered by django.contrib.auth.admin when AUTH_USER_MODEL is set
# This file intentionally left to avoid AlreadyRegistered error
# If you need custom admin, unregister first then re-register:
# try:
#     admin.site.unregister(User)
# except admin.sites.NotRegistered:
#     pass
# admin.site.register(User)
