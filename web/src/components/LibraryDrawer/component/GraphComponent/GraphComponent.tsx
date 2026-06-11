import "./GraphComponent.css";

type GraphComponentProps = {
  title?: string;
};

export function GraphComponent({ title = "Graph component" }: GraphComponentProps) {
  return (
    <section className="library-graph-component">
      <h3>{title}</h3>
      <p>Placeholder for graph-related UI.</p>
    </section>
  );
}
