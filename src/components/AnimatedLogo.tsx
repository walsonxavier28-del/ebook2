import { useEffect, useState } from "react";

interface AnimatedLogoProps {
  size?: "sm" | "lg";
  showTagline?: boolean;
}

export default function AnimatedLogo({ size = "lg", showTagline = true }: AnimatedLogoProps) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dims = size === "lg" ? { box: 160, text: "text-5xl", tag: "text-sm" } : { box: 88, text: "text-2xl", tag: "text-xs" };

  return (
    <div className="flex flex-col items-center select-none">
      <div
        className="relative perspective-book"
        style={{ width: dims.box, height: dims.box }}
      >
        <div
          className="absolute inset-0 rounded-full blur-2xl bg-electric/40 animate-glow-pulse"
          style={{ animationDelay: "0.8s" }}
        />

        <svg
          viewBox="0 0 200 200"
          width={dims.box}
          height={dims.box}
          className={`relative z-10 transition-transform duration-500 hover:scale-110 drop-shadow-2xl ${play ? "animate-float" : ""}`}
          style={{ animationDelay: "1s" }}
        >
          <defs>
            <linearGradient id="eGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          <path
            d="M100 22c-32 0-56 24-56 55v40c0 34 26 60 60 60 20 0 37-9 48-23l-16-15c-7 9-18 15-32 15-19 0-33-13-35-31h74v-10c0-52-19-91-43-91zm-31 71c3-16 15-27 31-27s27 10 30 27H69z"
            fill="url(#eGradient)"
          />

          <g
            style={{
              transformOrigin: "100px 150px",
              transformStyle: "preserve-3d",
            }}
            className={play ? "animate-book-open" : ""}
          >
            <path
              d="M100 128 L40 148 L40 168 L100 178 Z"
              fill="#E8F0FF"
              opacity="0.95"
            />
            <path
              d="M100 128 L160 148 L160 168 L100 178 Z"
              fill="#0B0F19"
              stroke="#60a5fa"
              strokeWidth="1"
            />
          </g>
        </svg>
      </div>

      <div
        className={`mt-2 font-display font-extrabold ${dims.text} opacity-0 ${play ? "animate-fade-slide-up" : ""}`}
        style={{ animationDelay: "0.5s" }}
      >
        <span className="bg-gradient-to-r from-white via-electric-soft to-white bg-[200%_auto] bg-clip-text text-transparent animate-shine">
          eBook<span className="text-electric">ly</span>
        </span>
      </div>

      {showTagline && (
        <div
          className={`mt-1 tracking-widest text-electric-soft/80 ${dims.tag} opacity-0 ${play ? "animate-fade-slide-up" : ""}`}
          style={{ animationDelay: "0.75s" }}
        >
          Conhecimento que transforma
        </div>
      )}
    </div>
  );
}
