import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

import AppView from "@/pages/AppView";
import LoginView from "@/pages/LoginView";
import RegisterView from "@/pages/RegisterView";
import WorkspaceView from "@/pages/WorkspaceView";

function RequireAuth() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RedirectIfAuthenticated() {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/app/script" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/app/script" replace />} />
          <Route path="/app" element={<Navigate to="/app/script" replace />} />
          <Route path="/app/:sectionId" element={<AppView />} />
          <Route path="/app/:sectionId/:pageId" element={<AppView />} />
          <Route path="/workspace/:workspaceId" element={<WorkspaceView />} />
        </Route>

        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
