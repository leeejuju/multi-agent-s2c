import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

import HomeView from "@/pages/HomeView";
import LoginView from "@/pages/LoginView";
import RegisterView from "@/pages/RegisterView";

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
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1a1a1a",
          colorText: "#1a1a1a",
          colorTextSecondary: "#666666",
          borderRadius: 8,
          fontFamily:
            'sans-serif, "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans SC", ui-sans-serif, system-ui',
        },
        components: {
          Button: {
            borderRadius: 14,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 14,
            controlHeight: 44,
          },
          Select: {
            borderRadius: 10,
            controlHeight: 36,
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomeView />} />
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<LoginView />} />
            <Route path="/register" element={<RegisterView />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
