import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

import HomeView from "@/pages/HomeView";
import LoginView from "@/pages/LoginView";

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
          colorPrimary: "#E8E2D5",
          colorPrimaryActive: "#D6CCBA",
          colorPrimaryHover: "#DED6C6",
          colorBgBase: "#FAF9F6",
          colorBgContainer: "#FFFFFF",
          colorBgLayout: "#FAF9F6",
          colorBorder: "#D6D3C9",
          colorBorderSecondary: "#E5E2DA",
          colorText: "#2C2C2C",
          colorTextLightSolid: "#2C2C2C",
          colorTextSecondary: "#707070",
          borderRadius: 8,
          controlHeight: 34,
          controlHeightLG: 38,
          controlHeightSM: 28,
          fontFamily:
            '"Inspire Mono", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans SC", monospace',
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 32,
            paddingInline: 12,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 36,
          },
          Select: {
            borderRadius: 8,
            controlHeight: 34,
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<HomeView />} />
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<LoginView />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
