import logo from "@/assets/buildverse-logo.png.asset.json";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
};

export function Logo({ size = "md" }: { size?: Size; glow?: boolean }) {
  return (
    <img
      src={logo.url}
      alt="BuildVerse"
      className={`${SIZE[size]} object-contain`}
    />
  );
}
