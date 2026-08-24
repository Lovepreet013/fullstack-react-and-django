from django.shortcuts import render
from rest_framework import viewsets, filters, permissions
from .serializers import PersonSerializer
from .models import Person


class PersonView(viewsets.ModelViewSet):
    serializer_class = PersonSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["first_name", "last_name"]
    ordering_fields = ["first_name", "last_name", "id"]
    ordering = ["id"]

    def get_queryset(self):
        return Person.objects.filter(owner=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
