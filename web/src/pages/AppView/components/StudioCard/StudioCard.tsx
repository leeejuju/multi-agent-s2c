import type { ReactNode } from "react";

import "./StudioCard.css";

type StudioCardProps = {
  children: ReactNode;
  onClick?: () => void;
};

export default function StudioCard({
  children,
  onClick,
}: StudioCardProps) {
  if (onClick) {
    return (
      <button
        className="studio-card studio-card--interactive"
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }

  return <article className="studio-card">{children}</article>;
}
