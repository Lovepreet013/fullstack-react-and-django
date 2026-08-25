import { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate, Navigate } from "react-router";
import api from "../api";
import { notifyAuthChange, useIsAuthenticated } from "../useAuth";
import { consumeAuth0Redirect } from "../auth0Redirect";

interface Auth0LoginButtonProps {
  mode?: "login" | "register";
  onError?: (msg: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Auth0LoginButton({ mode: _mode = "login", onError }: Auth0LoginButtonProps) {
  const { loginWithRedirect, getIdTokenClaims, isAuthenticated, getAccessTokenSilently, user, isLoading: auth0Loading } = useAuth0();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const alreadyLoggedIn = useIsAuthenticated();
  const exchangeStartedRef = useRef(false);

  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
  const isConfigured =
    !!domain &&
    !!clientId &&
    domain !== "YOUR_AUTH0_DOMAIN" &&
    clientId !== "YOUR_AUTH0_CLIENT_ID" &&
    domain !== "" &&
    clientId !== "";

  const handleLogin = async () => {
    if (!isConfigured) {
      const msg = "Auth0 not configured. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in frontend/.env";
      setLocalError(msg);
      onError?.(msg);
      return;
    }
    setLocalError("");
    try {
      await loginWithRedirect({
        authorizationParams: {
          // Force Google via Auth0 dev keys without needing Google Cloud Console
          connection: "google-oauth2",
          // Always show Google's account chooser so the user can pick a Gmail
          // (otherwise Auth0/Google SSO silently reuses the previous account)
          prompt: "select_account",
          scope: "openid profile email",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start Auth0 login";
      setLocalError(msg);
      onError?.(msg);
    }
  };

  const handleExchange = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setLocalError("");
    try {
      // Prefer ID token (contains email/picture/name); fallback to access token
      let idToken: string | undefined;
      try {
        const claims = await getIdTokenClaims();
        // claims.__raw is the raw JWT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        idToken = (claims as any)?.__raw as string | undefined;
      } catch {
        // ignore
      }
      if (!idToken) {
        try {
          const token = await getAccessTokenSilently();
          idToken = token as unknown as string;
        } catch {
          // fallback to user object not usable for backend verification
        }
      }
      if (!idToken) {
        throw new Error("Could not retrieve Auth0 token");
      }
      const res = await api.post("auth/auth0/", { id_token: idToken });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      notifyAuthChange();
      navigate("/dashboard");
    } catch (err: unknown) {
      let msg = "Auth0 authentication failed.";
      if (err && typeof err === "object" && "response" in err) {
        const data = (err as { response?: { data?: unknown } }).response?.data;
        if (data && typeof data === "object") {
          const d = data as Record<string, unknown>;
          if (typeof d.error === "string") msg = d.error;
          else if (typeof d.detail === "string") msg = d.detail as string;
          else msg = JSON.stringify(data);
        } else if (typeof data === "string") {
          msg = data;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setLocalError(msg);
      onError?.(msg);
      // Strip code/state from the URL so a refresh doesn't re-trigger a failing exchange
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Auto-exchange only right after the Auth0 redirect back. The redirect flag
  // is set by Auth0Provider's onRedirectCallback (fires exactly once), which is
  // reliable regardless of URL cleanup timing.
  useEffect(() => {
    if (!isConfigured) return;
    if (auth0Loading) return;
    if (alreadyLoggedIn) return;
    if (isAuthenticated && user && !loading && !exchangeStartedRef.current && consumeAuth0Redirect()) {
      exchangeStartedRef.current = true;
      handleExchange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, auth0Loading, alreadyLoggedIn, isConfigured]);

  // Already logged into the app: never show the login form, go to dashboard
  if (alreadyLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  // If already authenticated via Auth0 (redirect back), show exchange button
  if (!isConfigured) {
    return (
      <div className="google-auth-disabled">
        <p className="card-meta" style={{ textAlign: "center", fontSize: "0.78rem" }}>
          Auth0 login not configured. Set <code>VITE_AUTH0_DOMAIN</code> and <code>VITE_AUTH0_CLIENT_ID</code> in{" "}
          <code>frontend/.env</code> and <code>AUTH0_DOMAIN</code> in backend env.{" "}
          <a href="https://manage.auth0.com/dashboard" target="_blank" rel="noreferrer">
            Create free tenant at manage.auth0.com
          </a>{" "}
          → enable Google (dev keys, no Google Cloud needed).
        </p>
      </div>
    );
  }

  // When Auth0 redirects back, user will have isAuthenticated true but no Django session yet
  // Show a one-click exchange (auto-exchange via useEffect above, but keep as fallback)
  if (isAuthenticated && user) {
    return (
      <div className="google-auth-wrap">
        {localError && <div className="auth-error" style={{ margin: "0 0 12px 0" }}>{localError}</div>}
        <p className="card-meta" style={{ textAlign: "center", fontSize: "0.78rem" }}>
          Signed in via Auth0 as {user.email || user.name}
        </p>
        <button onClick={handleExchange} className="btn-auth" disabled={loading} type="button">
          {loading ? "Completing login..." : "Continue to app"}
        </button>
      </div>
    );
  }

  return (
    <div className="google-auth-wrap">
      {localError && <div className="auth-error" style={{ margin: "0 0 12px 0" }}>{localError}</div>}
      <button onClick={handleLogin} className="btn-auth" disabled={loading} type="button" style={{ background: "#635DFF", borderColor: "#635DFF" }}>
        {loading ? "Redirecting..." : "Continue with Google (via Auth0)"}
      </button>
      <p className="card-meta" style={{ textAlign: "center", fontSize: "0.72rem", marginTop: 6 }}>
        No Google Cloud needed — uses Auth0 dev keys
      </p>
    </div>
  );
}
