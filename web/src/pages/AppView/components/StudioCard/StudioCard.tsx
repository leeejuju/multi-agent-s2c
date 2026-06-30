import type { ReactNode } from "react";

import "./StudioCard.css";

type StudioCardProps = {
  children: ReactNode;
  onClick?: () => void;
};

const studioCardClass =
  "studio-card group relative flex h-[364px] w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md";

export default function StudioCard({
  children,
  onClick,
}: StudioCardProps) {
  const classes = onClick ? `${studioCardClass} cursor-pointer` : studioCardClass;

  if (onClick) {
    return (
      <button className={classes} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <article className={classes}>{children}</article>;
}
