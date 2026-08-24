from rest_framework import serializers
from .models import Person


class PersonSerializer(serializers.ModelSerializer):
    gender = serializers.ChoiceField(choices=Person.Gender.choices)
    hobbies = serializers.MultipleChoiceField(
        choices=Person.Hobby.choices, allow_empty=False
    )

    class Meta:
        model = Person
        fields = ["id", "first_name", "last_name", "email", "gender", "hobbies"]
        read_only_fields = ["owner"]
