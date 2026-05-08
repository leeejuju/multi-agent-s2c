import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layers3, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { authApi } from "@/api/auth";

export default function RegisterView() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (username.trim().length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authApi.register({
        username: username.trim(),
        password,
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
    <main className="auth-page grid min-h-screen place-items-center p-6 bg-gradient-to-b from-[#fbfbfd] to-[#f5f5f7]">
      <motion.section 
        className="apple-panel w-full max-w-[460px] p-10 py-12" 
        aria-labelledby="register-title"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex h-16 w-16 items-center justify-center bg-black text-white rounded-[18px] mb-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          >
            <Layers3 size={32} strokeWidth={2.2} />
          </motion.div>
          <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-[0.1em] mb-2">
            multi-agent-s2c
          </p>
          <h1 id="register-title" className="apple-title">
            Create Account
          </h1>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleRegister}>
          <div>
            <label className="apple-label" htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              className="apple-input"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your username"
              type="text"
              value={username}
            />
          </div>

          <div>
            <label className="apple-label" htmlFor="password">Password</label>
            <input
              id="password"
              autoComplete="new-password"
              className="apple-input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="auth-message auth-message-error"
            >
              {errorMessage}
            </motion.div>
          ) : null}

          {successMessage ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="auth-message auth-message-success"
            >
              {successMessage}
            </motion.div>
          ) : null}

          <button className="apple-btn mt-3" disabled={isLoading} type="submit">
            {isLoading ? <Loader2 className="spin" size={20} /> : "Continue"}
          </button>
        </form>

        <p className="apple-footer">
          Already have an account?{" "}
          <Link className="apple-link" to="/login">
            Sign in
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
