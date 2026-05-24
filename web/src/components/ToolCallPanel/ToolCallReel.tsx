import type { ToolActivity } from "@/hooks/useChat";

type Props = {
  activity: ToolActivity;
};

const activeFrames = [
  "Preparing tool call",
  "Reading arguments",
  "Running task",
  "Collecting results",
  "Merging output",
];

function getItems(activity: ToolActivity) {
  const items = [
    `Tool: ${activity.name}`,
    activity.query ? `Question: ${activity.query}` : "Question: waiting for args",
    ...(activity.resultItems?.length ? activity.resultItems : activeFrames),
  ].slice(0, 5);
  return [...items, items[0]];
}

export default function ToolCallReel({ activity }: Props) {
  return (
    <div className="tool-call-reel">
      <div className="tool-call-reel-wipe" />
      <div className="tool-call-reel-track">
        {getItems(activity).map((item, index) => (
          <div className="tool-call-reel-row" key={`${item}-${index}`}>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
