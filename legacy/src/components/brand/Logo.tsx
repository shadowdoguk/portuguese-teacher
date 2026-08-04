import type { SVGProps } from "react";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="40" height="40" rx="9" fill="currentColor" />
      <path
        d="M11 30 L20 11 L29 30 M14.5 23 L25.5 23"
        stroke="#FAF6F0"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="13" r="2" fill="#C2410C" />
    </svg>
  );
}