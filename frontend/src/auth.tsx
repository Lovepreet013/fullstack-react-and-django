import api from "./api";

export async function logout() {
  const refresh = localStorage.getItem("refresh");
  try {
    if (refresh) {
      await api.post("logout/", { refresh });
    }
  } catch {
    // ignore errors — clear tokens regardless
  } finally {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  }
}