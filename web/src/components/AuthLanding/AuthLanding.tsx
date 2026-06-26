import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";

import {
  landingPosterDecorations,
  landingShapeDecorations,
  type LandingPosterDecoration,
  type LandingShapeDecoration,
} from "@/assets/landing/posters";

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

function HeroContent() {
  return (
    <section
      className="landing-hero landing-animated-hidden relative z-20 flex min-h-[100svh] w-full items-center justify-center px-5 py-28 text-center"
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
        <p className="mt-5 text-[clamp(1.05rem,2vw,1.34rem)] font-medium tracking-[0.1em] text-landing-text/76">
          漂浮的分镜工作台
        </p>
        <p className="mt-4 max-w-[28rem] text-[0.98rem] leading-7 text-landing-muted max-[520px]:text-[0.92rem]">
          把故事，变成看得见的分镜。
        </p>

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

export default function AuthLanding(_props: { mode: AuthMode }) {
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
      <HeroContent />
      {loadingMounted ? <LoadingSequence loadingRef={loadingRef} /> : null}
    </main>
  );
}
