import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("auth-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("auth-change", callback);
  };
}

function getSnapshot(): boolean {
  return !!localStorage.getItem("access");
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function notifyAuthChange(): void {
  window.dispatchEvent(new Event("auth-change"));
}
