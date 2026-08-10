export default function Stamp({
  children,
  tone = "stamp"
}: {
  children: React.ReactNode;
  tone?: "stamp" | "cadastral" | "ink";
}) {
  const color =
    tone === "cadastral" ? "text-cadastral" : tone === "ink" ? "text-ink" : "text-stamp";
  return <span className={`stamp ${color}`}>{children}</span>;
}
