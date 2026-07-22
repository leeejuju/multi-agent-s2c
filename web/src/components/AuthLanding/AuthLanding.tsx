import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Form as RadixForm } from "radix-ui";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";
import heroPoster from "@/assets/landing/julia-portal-abyss.webp";
import { useAuthStore } from "@/store/auth";

import "./AuthLanding.css";

export type AuthMode = "login" | "register";

const pageCopy = {
  login: {
    eyebrow: "欢迎回来",
    title: "继续创作",
    description: "登录后回到你的剧本、分镜与视觉工作区。",
    switchLead: "还没有账号？",
    switchAction: "创建账号",
    switchTo: "/register",
  },
  register: {
    eyebrow: "建立创作空间",
    title: "开始第一场戏",
    description: "创建账号，把剧本与分镜保存在同一个工作区。",
    switchLead: "已有账号？",
    switchAction: "登录",
    switchTo: "/login",
  },
} as const;

function AuthForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegistering = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("请输入邮箱。");
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        await authApi.register({ email: normalizedEmail, password });
      }

      const response = await authApi.login({
        email: normalizedEmail,
        password,
      });
      setAuth(response.access_token, response.user);
      navigate("/app/script", { replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "认证请求失败。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RadixForm.Root className="auth-form" onSubmit={handleSubmit}>
      <RadixForm.Field className="auth-field" name="email">
        <RadixForm.Label className="auth-field-label">邮箱</RadixForm.Label>
        <div className="auth-input-shell">
          <Mail aria-hidden="true" size={18} strokeWidth={1.6} />
          <RadixForm.Control
            aria-label="邮箱"
            autoComplete="email"
            className="auth-input"
            maxLength={255}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={email}
          />
        </div>
      </RadixForm.Field>

      <RadixForm.Field className="auth-field" name="password">
        <RadixForm.Label className="auth-field-label">密码</RadixForm.Label>
        <div className="auth-input-shell">
          <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.6} />
          <RadixForm.Control
            aria-label="密码"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            className="auth-input"
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegistering ? "至少 6 位" : "输入密码"}
            type="password"
            value={password}
          />
        </div>
      </RadixForm.Field>

      {isRegistering ? (
        <RadixForm.Field className="auth-field" name="confirmPassword">
          <RadixForm.Label className="auth-field-label">
            确认密码
          </RadixForm.Label>
          <div className="auth-input-shell">
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.6} />
            <RadixForm.Control
              aria-label="确认密码"
              autoComplete="new-password"
              className="auth-input"
              maxLength={128}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次输入密码"
              type="password"
              value={confirmPassword}
            />
          </div>
        </RadixForm.Field>
      ) : null}

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <RadixForm.Submit
        aria-busy={submitting}
        className="auth-submit"
        disabled={submitting}
      >
        <span>
          {submitting ? "处理中" : isRegistering ? "创建账号" : "进入工作台"}
        </span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </RadixForm.Submit>
    </RadixForm.Root>
  );
}

function VisualIntroduction() {
  return (
    <section className="auth-visual" aria-labelledby="auth-visual-title">
      <img
        alt=""
        aria-hidden="true"
        className="auth-visual-image"
        src={heroPoster}
      />
      <div className="auth-visual-content">
        <div className="auth-brand" aria-label="剧画">
          <span className="auth-brand-mark" aria-hidden="true" />
          <span>剧画</span>
        </div>

        <div className="auth-visual-copy">
          <p className="auth-visual-eyebrow">AI 影视创作工作台</p>
          <h1 id="auth-visual-title">
            让故事，
            <br />
            先有画面。
          </h1>
          <p className="auth-visual-description">
            从剧本结构、镜头调度到视觉提示，在同一个工作区完成创作。
          </p>
        </div>

        <ol className="auth-workflow" aria-label="创作流程">
          <li>
            <span>写剧本</span>
            <small>梳理故事与对白</small>
          </li>
          <li>
            <span>排分镜</span>
            <small>确定镜头与节奏</small>
          </li>
          <li>
            <span>定画面</span>
            <small>生成视觉提示</small>
          </li>
        </ol>
      </div>
    </section>
  );
}

export default function AuthLanding({ mode }: { mode: AuthMode }) {
  const copy = pageCopy[mode];

  return (
    <main className="auth-page">
      <VisualIntroduction />

      <section className="auth-access" aria-labelledby="auth-page-title">
        <div className="auth-switch">
          <span>{copy.switchLead}</span>
          <Link className="auth-switch-link" to={copy.switchTo}>
            {copy.switchAction}
          </Link>
        </div>

        <div className="auth-form-panel">
          <p className="auth-form-eyebrow">{copy.eyebrow}</p>
          <h2 id="auth-page-title">{copy.title}</h2>
          <p className="auth-form-description">{copy.description}</p>
          <AuthForm mode={mode} />
          <p className="auth-account-note">账号仅用于保存你的创作进度。</p>
        </div>

        <p className="auth-product-note">SCRIPT TO SCENE · 剧画</p>
      </section>
    </main>
  );
}
