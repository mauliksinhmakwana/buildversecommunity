import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-border py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo size="sm" glow={false} />
          <span className="font-display font-bold tracking-tight">
            Founder<span className="text-primary">Forge</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} FounderForge. Where founders are forged.
        </p>
      </div>
    </footer>
  );
}
