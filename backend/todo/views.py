from django.shortcuts import render
from rest_framework import viewsets, filters
from .serializers import PersonSerializer
from .models import Person


# Create your views here.
class PersonView(viewsets.ModelViewSet):
    serializer_class = PersonSerializer
    # explicit ordering so pagination is stable (newest id at the end, page 1 = oldest)

    queryset = Person.objects.all().order_by("id")

    # Server-side search + ordering: enables ?search= and ?ordering= together with pagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["first_name", "last_name"]
    ordering_fields = ["first_name", "last_name", "id"]
    ordering = ["id"]  # default when user has not selected a sort option
