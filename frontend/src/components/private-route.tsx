import { Navigate } from "react-router";
import type { JSX } from "react/jsx-runtime";
import { useIsAuthenticated } from "../useAuth";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}