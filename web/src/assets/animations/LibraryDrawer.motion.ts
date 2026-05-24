import type { HTMLMotionProps } from "motion/react";

type MotionDivProps = Pick<
  HTMLMotionProps<"div">,
  "animate" | "exit" | "initial" | "transition"
>;

export const libraryOverlayMotion: MotionDivProps = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 1 },
};

export function getLibraryPanelMotion(
  shouldReduceMotion: boolean | null,
): MotionDivProps {
  return {
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
    transition: { duration: shouldReduceMotion ? 0.12 : 0.18, ease: "easeOut" },
  };
}
