/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import api from "../api";
import { notifyAuthChange } from "../useAuth";
import type { User } from "../types";
import AvatarCropModal from "./avatar-crop-modal";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // fetch current user
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("profile/")
      .then((res) => {
        if (cancelled) return;
        const u: User = res.data;
        setUser(u);
        setUsername(u.username);
        setEmail(u.email || "");
        setFirstName(u.first_name || "");
        setLastName(u.last_name || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data ? JSON.stringify(err.response.data) : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // preview for selected file
  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError("");
    setSuccess("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (file.type && !allowed.includes(file.type)) {
      setError("Only JPEG, PNG and WEBP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    // allow up to 5MB original for cropping flexibility; final cropped will be validated at 2MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB). Please choose a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    // free-aspect crop: show modal immediately
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setRawImageSrc(result);
      setOriginalFile(file);
      setShowCropper(true);
    };
    reader.onerror = () => {
      setError("Failed to read image.");
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected after cancel
    // value will be cleared on crop confirm/cancel
  };

  const handleCropConfirm = (croppedFile: File) => {
    setSelectedFile(croppedFile);
    setRemoveAvatarFlag(false);
    setShowCropper(false);
    setRawImageSrc(null);
    setOriginalFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    setSuccess("");
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setRawImageSrc(null);
    setOriginalFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onClickRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    setRawImageSrc(null);
    setOriginalFile(null);
    setShowCropper(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    setSuccess("");
    if (user?.avatar || user?.avatar_url) {
      setRemoveAvatarFlag(true);
    }
  };

  useEffect(() => {
    if (selectedFile) setRemoveAvatarFlag(false);
  }, [selectedFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password || confirmPassword) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("username", username.trim());
        formData.append("email", email.trim());
        formData.append("first_name", firstName.trim());
        formData.append("last_name", lastName.trim());
        formData.append("avatar", selectedFile);
        if (password) formData.append("password", password);
        res = await api.patch("profile/", formData);
      } else if (removeAvatarFlag) {
        // removal requires avatar: null via JSON
        const payload: Record<string, unknown> = {
          username: username.trim(),
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          avatar: null,
        };
        if (password) payload.password = password;
        res = await api.patch("profile/", payload);
      } else {
        const payload: Record<string, unknown> = {
          username: username.trim(),
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        };
        if (password) payload.password = password;
        res = await api.patch("profile/", payload);
      }

      setUser(res.data);
      setUsername(res.data.username);
      setEmail(res.data.email || "");
      setFirstName(res.data.first_name || "");
      setLastName(res.data.last_name || "");

      setSelectedFile(null);
      setRemoveAvatarFlag(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPreview(null);
      setPassword("");
      setConfirmPassword("");
      setSuccess("Profile updated successfully.");
      notifyAuthChange();
    } catch (err: unknown) {
      let msg = "Failed to update profile.";
      if (err && typeof err === "object" && "response" in err) {
        const data = (err as { response?: { data?: unknown } }).response?.data;
        if (data) {
          if (typeof data === "string") msg = data;
          else if (typeof data === "object") msg = JSON.stringify(data);
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="app">
        <div className="empty-state">Loading profile...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app">
        <div className="auth-error" style={{ margin: 0 }}>{error || "Unable to load profile."}</div>
        <Link to="/dashboard" className="btn btn-back" style={{ marginTop: 16, display: "inline-block" }}>Back to dashboard</Link>
      </main>
    );
  }

  const avatarSrc = preview || user.avatar_url || user.avatar || null;
  // avatar URL may be absolute already
  const displayAvatar = avatarSrc
    ? avatarSrc.startsWith("http") || avatarSrc.startsWith("blob:")
      ? avatarSrc
      : `http://localhost:8000${avatarSrc}`
    : null;

  return (
    <main className="app">
      {showCropper && rawImageSrc && originalFile && (
        <AvatarCropModal
          imageSrc={rawImageSrc}
          originalFile={originalFile}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
      <header className="app-header">
        <p className="eyebrow">Account</p>
        <h1 className="app-title">Profile</h1>
      </header>

      <div className="card">
        <div className="card-toolbar">
          <span className="card-meta">Update your personal details and avatar</span>
          <Link to="/dashboard" className="btn btn-back">Back</Link>
        </div>

        <div style={{ padding: "22px" }}>
          {error && <div className="auth-error" style={{ margin: "0 0 16px 0" }}>{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Avatar section */}
            <div className="avatar-section">
              <div className="avatar-preview-wrap">
                {displayAvatar && !removeAvatarFlag ? (
                  <img src={displayAvatar} alt={username} className="avatar-preview" />
                ) : (
                  <span className="avatar-preview avatar-preview-fallback" aria-hidden>
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="avatar-actions">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="avatar">Avatar (max 2MB, JPEG/PNG/WEBP)</label>
                  <input
                    ref={fileInputRef}
                    id="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-delete" onClick={onClickRemove} style={{ fontSize: "0.78rem" }}>
                    Remove avatar
                  </button>
                  {selectedFile && (
                    <span className="card-meta" style={{ alignSelf: "center" }}>{selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>


            <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0 4px", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>Change password (leave blank to keep current)</p>
              <div className="form-group">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </div>

            <button type="submit" className="btn-auth" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>

          <div className="detail-meta" style={{ marginTop: 22 }}>
            <p className="detail-row"><span className="detail-label">Joined</span><span className="detail-value">{new Date(user.date_joined).toLocaleString()}</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
