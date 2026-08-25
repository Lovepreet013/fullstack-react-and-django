from django.contrib import admin

from .models import Person
from accounts.models import User


# Register your models here.
class PersonAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "gender", "hobbies")
    search_fields = ("first_name", "last_name", "email")
    list_filter = ("gender",)


class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "first_name", "last_name", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ("is_staff", "is_superuser", "is_active")


admin.site.register(Person, PersonAdmin)
admin.site.register(User, UserAdmin)
