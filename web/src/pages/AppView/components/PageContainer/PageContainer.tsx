import type { ReactNode } from "react";
import { ScrollArea } from "radix-ui";

import "./PageContainer.css";

type PageContainerProps = {
  children?: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <section className={`page-container ${className}`}>
      <ScrollArea.Root
        className="page-container__scroll-area"
        type="hover"
      >
        <ScrollArea.Viewport className="page-container__viewport">
          {children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="page-container__scrollbar"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="page-container__scrollbar-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </section>
  );
}
