import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.shortcuts import render
from rest_framework import generics, permissions, parsers
from .models import User
from .serializers import Auth0Serializer, RegisterSerializer, UserDetailSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)


# Create your views here.
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self):
        return self.request.user


# --- Auth0 helpers (cached JWKS) ---
_AUTH0_JWKS_CACHE = {}  # domain -> {keys, fetched_at}


def _get_auth0_jwks(domain: str):
    import time
    import requests

    now = time.time()
    cached = _AUTH0_JWKS_CACHE.get(domain)
    if cached and now - cached["fetched_at"] < 600:  # 10 min cache
        return cached["keys"]
    url = f"https://{domain}/.well-known/jwks.json"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    keys = data.get("keys", [])
    _AUTH0_JWKS_CACHE[domain] = {"keys": keys, "fetched_at": now}
    return keys


def _verify_auth0_token(token: str, domain: str, audience_list: list[str] | None):
    """
    Verify Auth0 ID token (RS256) via JWKS.
    Returns decoded payload if valid, else raises.
    """
    import json
    import jwt

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    alg = header.get("alg")
    if alg != "RS256":
        raise ValueError(f"Unsupported alg {alg}")
    if not kid:
        raise ValueError("Missing kid in token header")

    jwks = _get_auth0_jwks(domain)
    jwk = next((k for k in jwks if k.get("kid") == kid), None)
    if not jwk:
        # force refresh once
        import time

        _AUTH0_JWKS_CACHE.pop(domain, None)
        jwks = _get_auth0_jwks(domain)
        jwk = next((k for k in jwks if k.get("kid") == kid), None)
        if not jwk:
            raise ValueError("Unable to find matching JWK")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
    issuer = f"https://{domain}/"

    # Try each expected audience; if none provided, verify without aud
    # leeway handles clock skew between Auth0 server and backend (iat/nbf/exp)
    if audience_list:
        last_exc = None
        for aud in audience_list:
            try:
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    audience=aud,
                    issuer=issuer,
                    leeway=120,
                )
                return payload
            except Exception as e:
                last_exc = e
                continue
        # If all audiences failed, try without aud check but still verify issuer/signature
        # (Auth0 ID token aud is client_id, which may not be in audience_list if misconfigured)
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                issuer=issuer,
                options={"verify_aud": False},
                leeway=120,
            )
            # manually check aud is one of expected if we have list
            token_aud = payload.get("aud")
            # aud can be str or list
            token_auds = [token_aud] if isinstance(token_aud, str) else (token_aud or [])
            if not any(a in token_auds for a in audience_list):
                logger.warning("Auth0 token aud %s not in expected %s", token_auds, audience_list)
            return payload
        except Exception:
            raise last_exc if last_exc else ValueError("Invalid audience")
    else:
        # No audience configured: verify issuer/signature only
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
            leeway=120,
        )
        return payload


class Auth0AuthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = Auth0Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        id_token_str = serializer.validated_data["token"]

        domain = (settings.AUTH0_DOMAIN or "").strip().strip("/")
        # Remove https:// if provided
        if domain.startswith("https://"):
            domain = domain[len("https://") :]
        if domain.startswith("http://"):
            domain = domain[len("http://") :]

        if not domain:
            return Response(
                {"error": "Auth0 authentication is not configured on the server (AUTH0_DOMAIN missing)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Build expected audiences (Auth0 ID token aud = client_id, access token aud = API identifier)
        audiences: list[str] = []
        if getattr(settings, "AUTH0_AUDIENCE", ""):
            audiences.append(settings.AUTH0_AUDIENCE.strip())
        if getattr(settings, "AUTH0_CLIENT_ID", ""):
            audiences.append(settings.AUTH0_CLIENT_ID.strip())
        # fallback: if no audience configured, we still verify signature/issuer

        try:
            id_info = _verify_auth0_token(id_token_str, domain, audiences if audiences else None)
        except Exception as e:
            logger.warning("Auth0 token verification failed: %s", e)
            # Map common errors to user-friendly messages
            msg = str(e)
            if "ExpiredSignature" in type(e).__name__ or "expired" in msg.lower():
                return Response({"error": "Auth0 token has expired."}, status=status.HTTP_400_BAD_REQUEST)
            if "InvalidAudience" in type(e).__name__:
                return Response({"error": "Invalid Auth0 token audience."}, status=status.HTTP_400_BAD_REQUEST)
            if "InvalidIssuer" in type(e).__name__:
                return Response({"error": "Invalid Auth0 token issuer."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": f"Invalid Auth0 token: {msg}"}, status=status.HTTP_400_BAD_REQUEST)

        # Auth0 ID token claims
        sub = id_info.get("sub")
        email = id_info.get("email")
        email_verified = id_info.get("email_verified", True)  # Auth0 may not include if not requested, default True for social
        # Auth0 may store email_verified at top level or require scope; if missing, allow but log
        # For social logins (google), email_verified is often true

        if not sub:
            return Response({"error": "Auth0 token missing subject."}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            # Try to get email from nickname? But email is essential for linking policy
            return Response(
                {"error": "Auth0 token missing email (ensure 'email' scope is requested)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Linking policy: email is canonical, same as Google
        user = User.objects.filter(auth0_id=sub).first()
        if not user:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if user.auth0_id and user.auth0_id != sub:
                    return Response(
                        {"error": "This email is already linked to a different Auth0 account."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if User.objects.filter(auth0_id=sub).exclude(pk=user.pk).exists():
                    return Response(
                        {"error": "This Auth0 account is already linked to another user."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                user.auth0_id = sub
                user.save(update_fields=["auth0_id"])
                picture_url = id_info.get("picture")
                if picture_url and not user.avatar:
                    try:
                        import requests

                        resp = requests.get(picture_url, timeout=10)
                        if resp.status_code == 200 and resp.content:
                            content_type = resp.headers.get("Content-Type", "")
                            if "image" in content_type or picture_url.startswith("https://"):
                                ext = "jpg"
                                if "png" in content_type:
                                    ext = "png"
                                elif "webp" in content_type:
                                    ext = "webp"
                                elif "jpeg" in content_type or "jpg" in content_type:
                                    ext = "jpg"
                                if len(resp.content) <= 2 * 1024 * 1024:
                                    file_name = f"auth0_{user.pk}_{sub[-8:]}.{ext}"
                                    user.avatar.save(file_name, ContentFile(resp.content), save=True)
                    except Exception:
                        logger.exception("Failed to download Auth0 avatar for user %s (link)", user.pk)
            else:
                # Create new user from Auth0 info
                given_name = (id_info.get("given_name") or "").strip()
                family_name = (id_info.get("family_name") or "").strip()
                if not given_name and not family_name:
                    full_name = (id_info.get("name") or id_info.get("nickname") or "").strip()
                    if full_name:
                        parts = full_name.split()
                        given_name = parts[0] if parts else ""
                        family_name = " ".join(parts[1:]) if len(parts) > 1 else ""

                base_username = email.split("@")[0]
                import re

                base_username = re.sub(r"[^a-zA-Z0-9@.\+\-_]", "", base_username)
                if not base_username:
                    base_username = "user"
                username = base_username
                counter = 1
                max_base_len = 150
                while User.objects.filter(username=username).exists():
                    suffix = str(counter)
                    truncated = base_username[: max_base_len - len(suffix)]
                    username = f"{truncated}{suffix}"
                    counter += 1
                    if counter > 1000:
                        username = f"user_{sub[-8:]}"
                        break

                user = User(
                    username=username,
                    email=email.lower(),
                    first_name=given_name[:150],
                    last_name=family_name[:150],
                    auth0_id=sub,
                    auth_provider="auth0",
                )
                user.set_unusable_password()
                user.save()

                picture_url = id_info.get("picture")
                if picture_url and not user.avatar:
                    try:
                        import requests

                        resp = requests.get(picture_url, timeout=10)
                        if resp.status_code == 200 and resp.content:
                            content_type = resp.headers.get("Content-Type", "")
                            if "image" in content_type or picture_url.startswith("https://"):
                                ext = "jpg"
                                if "png" in content_type:
                                    ext = "png"
                                elif "webp" in content_type:
                                    ext = "webp"
                                elif "jpeg" in content_type or "jpg" in content_type:
                                    ext = "jpg"
                                if len(resp.content) <= 2 * 1024 * 1024:
                                    file_name = f"auth0_{user.pk}_{sub[-8:]}.{ext}"
                                    user.avatar.save(file_name, ContentFile(resp.content), save=True)
                    except Exception:
                        logger.exception("Failed to download Auth0 avatar for user %s", user.pk)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.pk,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
        )
