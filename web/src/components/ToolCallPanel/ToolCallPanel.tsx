import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import type { ToolActivity } from "@/hooks/useChat";
import ToolCallReel from "./ToolCallReel";
import ToolCallStatus from "./ToolCallStatus";

type Props = {
  activities: ToolActivity[];
};

function isActive(activity: ToolActivity) {
  return (
    activity.status === "analyzing" ||
    activity.status === "parsing" ||
    activity.status === "processing" ||
    activity.status === "searching" ||
    activity.status === "started" ||
    activity.status === "updated" ||
    activity.status === "uploading"
  );
}

export default function ToolCallPanel({ activities }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  if (activities.length === 0) return null;

  return (
    <div className="tool-call-stack">
      {activities.map((activity) => {
        const active = isActive(activity);
        const expanded = active || expandedIds.has(activity.id);

        return (
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className={`tool-call-card is-${activity.status}`}
            initial={{ opacity: 0, y: 8 }}
            key={activity.id}
            layout
          >
            <button
              aria-expanded={expanded}
              className="tool-call-card-header"
              onClick={() => {
                if (active) return;
                setExpandedIds((current) => {
                  const next = new Set(current);
                  if (next.has(activity.id)) {
                    next.delete(activity.id);
                  } else {
                    next.add(activity.id);
                  }
                  return next;
                });
              }}
              type="button"
            >
              <ToolCallStatus activity={activity} />
              {!active && (
                <ChevronDown
                  className={`tool-call-chevron ${expanded ? "is-open" : ""}`}
                  size={14}
                />
              )}
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="tool-call-card-body"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                >
                  <div className="tool-call-meta">
                    <span>{activity.name}</span>
                    <span>{activity.query || activity.title || "waiting for args"}</span>
                  </div>
                  <ToolCallReel activity={activity} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </div>
  );
}
