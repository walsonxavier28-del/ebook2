interface AnimatedLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export default function AnimatedLogo({ size = "lg", showTagline = true }: AnimatedLogoProps) {
  const pixelSize = size === "sm" ? 48 : size === "md" ? 80 : 120;

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative group flex items-center justify-center">
        <img
          src="/logo.png"
          alt="eBookly"
          width={pixelSize}
          height={pixelSize}
          style={{ width: pixelSize, height: pixelSize }}
          className="relative rounded-2xl object-cover shadow-md md:rounded-3xl md:animate-float transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {showTagline && (
        <div className="mt-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-black text-white tracking-tight">
            eBook<span className="text-electric-soft">ly</span>
          </h2>
          <p className="mt-1 text-xs md:text-sm tracking-wide text-white/70 font-medium">
            Conhecimento que transforma
          </p>
        </div>
      )}
    </div>
  );
}
