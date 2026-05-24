import { Alert, Button, Form, Input } from "antd";
import { Layers3 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";

type RegisterFormValues = {
  password: string;
  username: string;
};

export default function RegisterView() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleRegister = async (values: RegisterFormValues) => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await authApi.register({
        username: values.username.trim(),
        password: values.password,
      });

      setSuccessMessage("Account created. Redirecting to login...");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-[#fbfbfd] to-[#f5f5f7] p-6">
      <motion.section
        aria-labelledby="register-title"
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
            id="register-title"
            className="m-0 text-[34px] font-extrabold leading-[1.1] text-on-surface"
          >
            Create Account
          </h1>
        </div>

        <Form
          layout="vertical"
          onFinish={handleRegister}
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
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </Form.Item>

          {errorMessage ? (
            <Alert className="mb-4" message={errorMessage} showIcon type="error" />
          ) : null}

          {successMessage ? (
            <Alert className="mb-4" message={successMessage} showIcon type="success" />
          ) : null}

          <Form.Item className="mb-0 mt-6">
            <Button block htmlType="submit" loading={isLoading} type="primary">
              Continue
            </Button>
          </Form.Item>
        </Form>

        <p className="mt-6 text-center text-sm font-semibold text-on-surface-variant">
          Already have an account?{" "}
          <Link className="font-bold text-[#007aff] hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
