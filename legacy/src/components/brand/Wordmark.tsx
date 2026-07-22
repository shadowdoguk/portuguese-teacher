import type { SVGProps } from "react";

export function Wordmark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 86 22"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Português"
      {...props}
    >
      <text
        x="0"
        y="17"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="20"
        fontWeight="500"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        Português
      </text>
      <circle cx="80" cy="6" r="3" fill="#C2410C" />
    </svg>
  );
}