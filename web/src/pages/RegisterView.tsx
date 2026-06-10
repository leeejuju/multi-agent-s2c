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
    <main className="grid min-h-screen place-items-center bg-main-background p-5">
      <motion.section
        aria-labelledby="register-title"
        className="w-full max-w-[400px] rounded-[18px] border border-border bg-card-background px-7 py-8 shadow-[0_16px_38px_rgba(44,44,44,0.08)]"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
      >
        <div className="mb-7 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent text-primary-button-text shadow-[0_8px_20px_rgba(44,44,44,0.1)]"
          >
            <Layers3 size={23} strokeWidth={2.1} />
          </motion.div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-on-surface-variant">
            multi-agent-s2c
          </p>
          <h1
            id="register-title"
            className="m-0 text-[24px] font-medium leading-tight text-on-surface"
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

        <p className="mt-5 text-center text-[13px] font-medium text-on-surface-variant">
          Already have an account?{" "}
          <Link className="font-bold text-on-surface hover:text-accent-hover hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
