import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import { Alert, Button, Input } from "antd";
import { gsap } from "gsap";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";
import {
  landingPosterDecorations,
  landingShapeDecorations,
  type LandingPosterDecoration,
  type LandingShapeDecoration,
} from "@/assets/landing/posters";
import { useAuthStore } from "@/store/auth";

type AuthMode = "login" | "register";

type LandingDecorStyle = CSSProperties & {
  "--landing-delay"?: string;
  "--poster-rotation"?: string;
};

const loadingPosterPositions = [
  { x: 0, y: 0, rotation: 0, scale: 1 },
  { x: 3, y: 4, rotation: 0, scale: 0.985 },
  { x: -3, y: 8, rotation: 0, scale: 0.97 },
  { x: 4, y: 12, rotation: 0, scale: 0.955 },
];

const navLinkClass =
  "landing-focus whitespace-nowrap rounded-lg px-1 py-1 text-[1rem] font-semibold tracking-[0.14em] text-landing-text/62 no-underline transition hover:text-landing-text max-[520px]:text-[0.78rem] max-[520px]:tracking-[0.08em]";

const navLoginButtonClass =
  "landing-focus whitespace-nowrap rounded-lg bg-landing-action px-2.5 py-1.5 text-[1rem] font-semibold tracking-[0.1em] text-landing-paper no-underline transition hover:bg-[#2f3b2b] max-[520px]:text-[0.76rem] max-[520px]:tracking-[0.06em]";

function LandingNav() {
  return (
    <header className="landing-nav landing-animated-hidden fixed left-0 top-0 z-30 flex w-full items-center justify-between gap-5 px-[clamp(1.25rem,4vw,4rem)] pt-[max(1.35rem,env(safe-area-inset-top))] max-[520px]:gap-3">
      <nav
        className="flex min-w-0 items-center gap-7 max-[640px]:gap-4 max-[520px]:gap-2.5"
        aria-label="主导航"
      >
        <Link className={navLinkClass} to="/">
          首页
        </Link>
        <Link className={navLinkClass} to="/app/script">
          工作台
        </Link>
        <Link className={navLinkClass} to="/app/script">
          创作
        </Link>
        <Link className={`${navLoginButtonClass} min-[521px]:hidden`} to="/login">
          登录
        </Link>
      </nav>

      <div className="flex shrink-0 items-center gap-5 max-[640px]:gap-3 max-[520px]:hidden">
        <Link className={navLoginButtonClass} to="/login">
          登录
        </Link>
      </div>
    </header>
  );
}

function AuthPanel({
  authMode,
  onModeChange,
}: {
  authMode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegistering = authMode === "register";

  useEffect(() => {
    setError(null);
    setConfirmPassword("");
  }, [authMode]);

  const switchMode = (nextMode: AuthMode) => {
    onModeChange(nextMode);
    navigate(nextMode === "register" ? "/register" : "/login", {
      replace: true,
    });
  };

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
        await authApi.register({
          email: normalizedEmail,
          password,
          username: normalizedEmail,
        });
      }

      const loginResponse = await authApi.login({
        password,
        username: normalizedEmail,
      });
      setAuth(loginResponse.access_token, loginResponse.user);
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
    <section
      aria-label="邮箱登录"
      className="landing-auth-panel mt-12 w-full max-w-[26rem] rounded-[24px] border border-landing-text/10 bg-landing-paper/90 p-6 text-left shadow-[0_24px_70px_rgba(41,45,37,0.12)] backdrop-blur-xl max-[520px]:mt-9 max-[520px]:rounded-[20px] max-[520px]:p-5"
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div>
          <Input
            aria-label="邮箱"
            autoComplete="email"
            maxLength={64}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱"
            prefix={<Mail aria-hidden="true" size={15} strokeWidth={2} />}
            size="large"
            type="email"
            value={email}
          />
        </div>

        <div>
          <Input.Password
            aria-label="密码"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            prefix={
              <LockKeyhole aria-hidden="true" size={15} strokeWidth={2} />
            }
            size="large"
            value={password}
          />
        </div>

        {isRegistering ? (
          <div>
            <Input.Password
              aria-label="确认密码"
              autoComplete="new-password"
              maxLength={128}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="确认密码"
              prefix={
                <LockKeyhole aria-hidden="true" size={15} strokeWidth={2} />
              }
              size="large"
              value={confirmPassword}
            />
          </div>
        ) : null}

        {error ? (
          <Alert
            className="mt-1"
            message={error}
            showIcon={false}
            type="error"
          />
        ) : null}

        <Button
          className="mt-2 w-full border-none bg-landing-action text-landing-paper shadow-none hover:!bg-[#2f3b2b] hover:!text-landing-paper"
          htmlType="submit"
          icon={<ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />}
          iconPosition="end"
          loading={submitting}
          size="large"
          type="primary"
        >
          {isRegistering ? "完成注册" : "登录"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 border-t border-landing-text/10 pt-5 text-[0.82rem] text-landing-muted">
        {isRegistering ? (
          <>
            <span>已有账号</span>
            <button
              className="landing-focus rounded-[8px] border-0 bg-transparent px-2 py-1 font-semibold text-landing-action underline-offset-4 hover:underline"
              onClick={() => switchMode("login")}
              type="button"
            >
              登录
            </button>
          </>
        ) : (
          <>
            <span>还没注册</span>
            <button
              className="landing-focus rounded-[8px] border-0 bg-transparent px-2 py-1 font-semibold text-landing-action underline-offset-4 hover:underline"
              onClick={() => switchMode("register")}
              type="button"
            >
              注册
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function HeroContent({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>(mode);
  const [panelOpen, setPanelOpen] = useState(mode === "register");

  useEffect(() => {
    setAuthMode(mode);
    setPanelOpen(mode === "register");
  }, [mode]);

  const openLoginPanel = () => {
    setAuthMode("login");
    setPanelOpen(true);
    navigate("/login", { replace: true });
  };

  return (
    <section
      className="landing-hero landing-animated-hidden relative z-20 flex h-[100svh] w-full items-center justify-center overflow-y-auto px-5 py-24 text-center max-[760px]:items-start max-[520px]:py-20"
      aria-labelledby="auth-home-title"
    >
      <div className="relative mx-auto flex w-[min(42rem,86vw)] flex-col items-center">
        <p className="mb-4 text-[0.78rem] font-semibold tracking-[0.24em] text-landing-muted max-[520px]:tracking-[0.16em]">
          从剧本到画面
        </p>
        <h1
          className="m-0 text-[clamp(4.2rem,13vw,9.6rem)] font-black leading-[0.86] tracking-normal text-landing-text"
          id="auth-home-title"
        >
          剧画
        </h1>
        <button
          className="landing-focus mt-8 rounded-[8px] bg-landing-action px-4 py-2 text-[0.9rem] font-semibold tracking-[0.08em] text-landing-paper shadow-[0_12px_32px_rgba(41,45,37,0.12)] transition hover:bg-[#2f3b2b]"
          onClick={openLoginPanel}
          type="button"
        >
          登录
        </button>
        <p className="mt-9 max-w-[28rem] text-[0.98rem] leading-7 text-landing-muted max-[520px]:mt-7 max-[520px]:text-[0.92rem]">
          把故事，变成看得见的分镜。
        </p>
        {panelOpen ? (
          <AuthPanel authMode={authMode} onModeChange={setAuthMode} />
        ) : null}
      </div>
    </section>
  );
}

function PosterCard({ poster }: { poster: LandingPosterDecoration }) {
  const style: LandingDecorStyle = {
    "--landing-delay": poster.delay,
    "--poster-rotation": poster.rotation,
  };

  return (
    <div
      className={`landing-poster-card landing-animated-hidden absolute ${poster.className}`}
      style={style}
      data-home-rotation={Number.parseFloat(poster.rotation)}
      data-scatter-scale={poster.scatterFrom.scale}
      data-scatter-x={poster.scatterFrom.x}
      data-scatter-y={poster.scatterFrom.y}
    >
      <img
        alt=""
        aria-hidden="true"
        className="h-full w-full select-none object-cover"
        draggable={false}
        src={poster.src}
      />
    </div>
  );
}

function ShapeBlock({ shape }: { shape: LandingShapeDecoration }) {
  const style: LandingDecorStyle = {
    "--landing-delay": shape.delay,
  };

  return (
    <div
      aria-hidden="true"
      className={`landing-shape landing-animated-hidden pointer-events-none absolute rounded-2xl shadow-[0_18px_48px_rgba(41,45,37,0.04)] ${shape.className}`}
      style={style}
    />
  );
}

function PosterField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {landingShapeDecorations.map((shape) => (
        <ShapeBlock key={`${shape.className}-${shape.delay}`} shape={shape} />
      ))}
      {landingPosterDecorations.map((poster) => (
        <PosterCard key={poster.src} poster={poster} />
      ))}
    </div>
  );
}

function LoadingSequence({
  loadingRef,
}: {
  loadingRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      aria-live="polite"
      className="landing-loader pointer-events-none absolute inset-0 z-40 flex min-h-[100svh] items-center justify-center bg-landing-bg px-6"
      ref={loadingRef}
      role="status"
    >
      <div className="flex flex-col items-center gap-7">
        <div className="relative h-[min(56vh,29rem)] w-[min(64vw,19rem)] [perspective:1200px] max-[520px]:h-[22rem] max-[520px]:w-[14.5rem]">
          {landingPosterDecorations.map((poster, index) => {
            const position =
              loadingPosterPositions[index] ?? loadingPosterPositions[0];

            return (
              <div
                className="landing-load-poster landing-loader-card absolute inset-0 overflow-hidden rounded-[22px] bg-landing-paper"
                data-load-rotation={position.rotation}
                data-load-scale={position.scale}
                data-load-x={position.x}
                data-load-y={position.y}
                key={`loading-${poster.src}`}
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full select-none object-cover"
                  draggable={false}
                  src={poster.src}
                />
              </div>
            );
          })}
        </div>

        <div className="landing-load-meta flex flex-col items-center text-[0.76rem] font-semibold tracking-[0.22em] text-landing-text/50">
          <span>正在翻阅影像档案</span>
          <span className="mt-3 block h-px w-36 overflow-hidden bg-landing-text/10">
            <span className="landing-load-line block h-full w-full origin-left bg-landing-text/45" />
          </span>
        </div>
      </div>
    </div>
  );
}

function readDataNumber(
  target: Element,
  key:
    | "homeRotation"
    | "loadRotation"
    | "loadScale"
    | "loadX"
    | "loadY"
    | "scatterScale"
    | "scatterX"
    | "scatterY",
  fallback: number,
) {
  const value = (target as HTMLElement).dataset[key];
  const parsed = Number.parseFloat(value ?? "");

  return Number.isFinite(parsed) ? parsed : fallback;
}

function useLandingIntroAnimation(
  pageRef: RefObject<HTMLElement | null>,
  loadingRef: RefObject<HTMLDivElement | null>,
  setLoadingMounted: (mounted: boolean) => void,
) {
  useEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const ctx = gsap.context(() => {
      const loading = loadingRef.current;
      const nav = page.querySelector<HTMLElement>(".landing-nav");
      const hero = page.querySelector<HTMLElement>(".landing-hero");
      const loadingMeta = page.querySelector<HTMLElement>(".landing-load-meta");
      const loadingLine = page.querySelector<HTMLElement>(".landing-load-line");
      const loadingTargets = loading ? [loading] : [];
      const navTargets = nav ? [nav] : [];
      const heroTargets = hero ? [hero] : [];
      const loadingMetaTargets = loadingMeta ? [loadingMeta] : [];
      const loadingLineTargets = loadingLine ? [loadingLine] : [];
      const loadingPosters = gsap.utils.toArray<HTMLElement>(
        ".landing-load-poster",
        page,
      );
      const homePosters = gsap.utils.toArray<HTMLElement>(
        ".landing-poster-card",
        page,
      );
      const shapes = gsap.utils.toArray<HTMLElement>(".landing-shape", page);
      const revealTargets = [
        ...navTargets,
        ...heroTargets,
        ...homePosters,
        ...shapes,
      ];

      gsap.set(revealTargets, { autoAlpha: 0 });
      gsap.set(navTargets, { y: -10 });
      gsap.set(heroTargets, { y: 18 });
      gsap.set(shapes, { scale: 0.98, y: 12 });
      gsap.set(loadingLineTargets, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(loadingMetaTargets, { autoAlpha: 0, y: 8 });
      gsap.set(loadingPosters, {
        autoAlpha: 1,
        backfaceVisibility: "hidden",
        rotation: (index, target) => readDataNumber(target, "loadRotation", index),
        scale: (index, target) => readDataNumber(target, "loadScale", 1),
        transformOrigin: "50% 50%",
        transformPerspective: 1200,
        x: (index, target) => readDataNumber(target, "loadX", index * 8),
        y: (index, target) => readDataNumber(target, "loadY", index * 8),
        zIndex: (index) => loadingPosters.length - index,
      });

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set(loadingTargets, { autoAlpha: 0, display: "none" });
        gsap.set(revealTargets, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(shapes, { autoAlpha: 0.72 });
        setLoadingMounted(false);
        return;
      }

      gsap.set(homePosters, {
        rotation: 0,
        scale: (index, target) => readDataNumber(target, "scatterScale", 0.74),
        x: (index, target) => readDataNumber(target, "scatterX", 0),
        y: (index, target) => readDataNumber(target, "scatterY", 0),
      });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          setLoadingMounted(false);
        },
      });

      tl.to(loadingMetaTargets, {
        autoAlpha: 1,
        duration: 0.28,
        y: 0,
      }).to(
        loadingLineTargets,
        {
          duration: 1.12,
          ease: "power2.inOut",
          scaleX: 1,
        },
        "<",
      );

      loadingPosters.forEach((poster, index) => {
        if (index === 0) {
          return;
        }

        const previousPoster = loadingPosters[index - 1];
        const posterX = readDataNumber(poster, "loadX", index * 8);

        tl.to(
          previousPoster,
          {
            autoAlpha: 0,
            duration: 0.18,
            ease: "power2.in",
            rotationY: -74,
            x: "-=20",
          },
          index === 1 ? "<0.18" : ">-0.02",
        ).fromTo(
          poster,
          {
            rotationY: 64,
            x: posterX + 18,
            zIndex: loadingPosters.length + index,
          },
          {
            duration: 0.28,
            ease: "power2.out",
            immediateRender: false,
            rotationY: 0,
            x: posterX,
          },
          "<",
        );
      });

      tl.to(loadingPosters, {
        autoAlpha: 1,
        duration: 0.34,
        rotation: (index, target) => readDataNumber(target, "loadRotation", index),
        rotationY: 0,
        scale: (index, target) => readDataNumber(target, "loadScale", 1),
        stagger: 0.04,
        x: (index, target) => readDataNumber(target, "loadX", index * 8),
        y: (index, target) => readDataNumber(target, "loadY", index * 8),
      })
        .to(
          loadingTargets,
          {
            autoAlpha: 0,
            duration: 0.28,
          },
          "+=0.08",
        )
        .to(
          shapes,
          {
            autoAlpha: 0.72,
            duration: 0.5,
            scale: 1,
            stagger: 0.05,
            y: 0,
          },
          "<0.03",
        )
        .to(
          homePosters,
          {
            autoAlpha: 1,
            duration: 0.74,
            ease: "power3.out",
            rotation: (index, target) =>
              readDataNumber(target, "homeRotation", 0),
            scale: 1,
            stagger: { amount: 0.22, from: "center" },
            x: 0,
            y: 0,
          },
          "<0.02",
        )
        .add(() => {
          gsap.set(homePosters, { clearProps: "transform" });
        })
        .to(
          navTargets,
          {
            autoAlpha: 1,
            duration: 0.42,
            y: 0,
          },
          "-=0.2",
        )
        .to(
          heroTargets,
          {
            autoAlpha: 1,
            duration: 0.54,
            y: 0,
          },
          "-=0.16",
        );
    }, page);

    return () => {
      ctx.revert();
    };
  }, [loadingRef, pageRef, setLoadingMounted]);
}

export default function AuthLanding({ mode }: { mode: AuthMode }) {
  const pageRef = useRef<HTMLElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [loadingMounted, setLoadingMounted] = useState(true);

  useLandingIntroAnimation(pageRef, loadingRef, setLoadingMounted);

  return (
    <main
      className="relative min-h-[100svh] w-screen overflow-hidden bg-landing-bg text-landing-text"
      ref={pageRef}
    >
      <PosterField />
      <LandingNav />
      <HeroContent mode={mode} />
      {loadingMounted ? <LoadingSequence loadingRef={loadingRef} /> : null}
    </main>
  );
}
