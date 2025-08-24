export function Card({ children, className = "", ...props }) {
  return (
    <div className={`rounded-2xl border border-white/20 bg-white/15 backdrop-blur ${className}`} {...props}>
      {children}
    </div>
  );
}
export function CardHeader({ children, className = "" }) {
  return <div className={`p-4 pb-2 ${className}`}>{children}</div>;
}
export function CardTitle({ children, className = "" }) {
  return <h3 className={`text-xl font-bold ${className}`}>{children}</h3>;
}
export function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
