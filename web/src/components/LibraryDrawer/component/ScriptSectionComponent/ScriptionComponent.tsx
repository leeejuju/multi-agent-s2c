import "./ScriptionComponent.css";

type ScriptionComponentProps = {
  title?: string;
};

export function ScriptionComponent({ title = "Scription component" }: ScriptionComponentProps) {
  return (
    <section className="library-scription-component">
      <h3>{title}</h3>
      <p>Placeholder for script-related UI.</p>
    </section>
  );
}
