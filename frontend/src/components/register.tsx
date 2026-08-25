import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import api from "../api";
import { notifyAuthChange, useIsAuthenticated } from "../useAuth";
import Auth0LoginButton from "./auth0-login-button";

export default function Register() {
  const isAuthenticated = useIsAuthenticated();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("register/", { username, email, password });
      // auto-login after successful registration
      const res = await api.post("token/", { username, password });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      notifyAuthChange();
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        err !== null &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: unknown } }).response?.data
          ? JSON.stringify((err as { response: { data: unknown } }).response.data)
          : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">Get started</p>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join to keep your people organized.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-body">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <Auth0LoginButton mode="register" onError={setError} />

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
