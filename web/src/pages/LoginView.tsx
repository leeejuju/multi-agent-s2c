import { Alert, Button, Form, Input } from "antd";
import { Layers3 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/auth";

type LoginFormValues = {
  password: string;
  username: string;
};

export default function LoginView() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form] = Form.useForm<LoginFormValues>();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await authApi.login({
        username: values.username.trim(),
        password: values.password,
      });

      setAuth(response.access_token, response.user);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-[#fbfbfd] to-[#f5f5f7] p-6">
      <motion.section
        aria-labelledby="login-title"
        className="w-full max-w-[460px] rounded-[42px] border border-white/40 bg-white/65 p-10 py-12 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-[40px] saturate-[200%]"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
      >
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          >
            <Layers3 size={32} strokeWidth={2.2} />
          </motion.div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
            multi-agent-s2c
          </p>
          <h1
            id="login-title"
            className="m-0 text-[34px] font-extrabold leading-[1.1] text-on-surface"
          >
            Welcome Back
          </h1>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          requiredMark={false}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: "Please enter your username." },
              { min: 3, message: "Username must be at least 3 characters." },
            ]}
          >
            <Input autoComplete="username" placeholder="Your username" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please enter your password." },
              { min: 6, message: "Password must be at least 6 characters." },
            ]}
          >
            <Input.Password
              autoComplete="current-password"
              placeholder="Password"
            />
          </Form.Item>

          {errorMessage ? (
            <Alert className="mb-4" message={errorMessage} showIcon type="error" />
          ) : null}

          <Form.Item className="mb-0 mt-6">
            <Button block htmlType="submit" loading={isLoading} type="primary">
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-sm font-semibold text-on-surface-variant">
          New here?{" "}
          <Link className="font-bold text-[#007aff] hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
