from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class UserDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "avatar_url",
            "date_joined",
            "password",
        ]
        read_only_fields = ["date_joined", "avatar_url"]
        extra_kwargs = {
            "email": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def validate_avatar(self, value):
        if value is None:
            return value
        # 2MB limit
        max_size = 2 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Avatar must be smaller than 2MB.")
        # content type check
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPEG, PNG and WEBP images are allowed."
            )
        return value

    def validate_username(self, value):
        # allow same username for current user, otherwise unique
        qs = (
            User.objects.filter(username=value).exclude(pk=self.instance.pk)
            if self.instance
            else User.objects.filter(username=value)
        )
        if qs.exists():
            raise serializers.ValidationError(
                "A user with that username already exists."
            )
        return value

    def validate_email(self, value):
        if value:
            qs = (
                User.objects.filter(email=value).exclude(pk=self.instance.pk)
                if self.instance
                else User.objects.filter(email=value)
            )
            # email not necessarily unique globally but check if needed; allow duplicates but validate format via EmailField
            pass
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        # handle avatar removal: if explicitly set to None, delete file
        avatar = validated_data.get("avatar", serializers.empty)
        if avatar is None:
            if instance.avatar:
                instance.avatar.delete(save=False)
        # handle old file cleanup when new file uploaded
        new_avatar = validated_data.get("avatar")
        if new_avatar and instance.avatar:
            # delete old file if different
            if instance.avatar.name != new_avatar.name:
                instance.avatar.delete(save=False)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
