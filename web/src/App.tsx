import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

import AppView from "@/pages/AppView";
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
    return <Navigate to="/app/script" replace />;
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
            '"Inspire Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans SC", "PingFang SC", "Noto Sans Ethiopic", "Kefa", "Nyala", sans-serif',
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
            <Route path="/" element={<Navigate to="/app/script" replace />} />
            <Route path="/app" element={<Navigate to="/app/script" replace />} />
            <Route path="/app/:sectionId" element={<AppView />} />
            <Route path="/app/:sectionId/:pageId" element={<AppView />} />
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
