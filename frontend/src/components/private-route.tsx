import { Navigate } from "react-router";
import type { JSX } from "react/jsx-runtime";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access");
  return token ? children : <Navigate to="/login" replace />;
}