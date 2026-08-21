from django.contrib import admin

from .models import Person


# Register your models here.
class PersonAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email")
    search_fields = ("first_name", "last_name", "email")


admin.site.register(Person, PersonAdmin)
