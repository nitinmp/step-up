export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-full bg-gradient-to-b from-brand-dark to-brand">
      <div className="min-h-full bg-background/95 backdrop-blur-sm">{children}</div>
    </div>
  );
}
