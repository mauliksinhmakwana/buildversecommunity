import logo from "@/assets/logo.png.asset.json";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export function Logo({ size = "md", glow = true }: { size?: Size; glow?: boolean }) {
  const cls = SIZE[size];
  return (
    <span className={`relative inline-flex ${cls}`}>
      {glow && (
        <span className="absolute inset-0 rounded-full bg-primary blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
      )}
      <img
        src={logo.url}
        alt="FounderForge"
        className={`relative ${cls} rounded-full object-cover ring-1 ring-white/10`}
      />
    </span>
  );
}
