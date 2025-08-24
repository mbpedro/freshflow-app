export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`px-4 py-3 rounded-xl font-semibold shadow transition hover:opacity-90 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
