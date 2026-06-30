import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <section
      className={`flex-1 min-h-0 overflow-hidden py-4 pr-4 pl-0 ${className}`}
    >
      <div className="h-full overflow-y-auto rounded-l-[32px] rounded-r-3xl bg-[#f7f7f6] shadow-[inset_10px_0_18px_rgba(15,23,42,0.035),0_1px_2px_rgba(15,23,42,0.04)]">
        {children}
      </div>
    </section>
  );
}
