from django.contrib import admin

from .models import Person


# Register your models here.
class PersonAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "gender", "hobbies")
    search_fields = ("first_name", "last_name", "email")
    list_filter = ("gender",)


admin.site.register(Person, PersonAdmin)
