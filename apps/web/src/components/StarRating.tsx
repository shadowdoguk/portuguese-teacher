// StarRating — accessible 1..5 star rating radio group.
//
// Used by practice pages to capture self-rating. The component
// keeps hover state local; the parent owns `value` + `onChange`.
// Accessibility: `role="radiogroup"` on the container with an
// `aria-label`; each button is `role="radio"` with an
// `aria-checked` and a screen-reader-friendly `aria-label`.
//
// The `gold` / `transparent` fill uses inline `style` so the
// component has zero CSS coupling (the project's design system
// doesn't ship yet — Phase C introduces the visual language).
// Replace with a CSS module + theme tokens when the design
// system lands.

import { useState } from 'react';

export interface StarRatingProps {
  readonly value: number;
  readonly onChange: (next: number) => void;
  readonly label?: string;
}

export function StarRating({ value, onChange, label = 'Rating' }: StarRatingProps): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = hovered !== null ? n <= hovered : n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(n)}
            style={{
              background: filled ? 'gold' : 'transparent',
              border: '1px solid #ccc',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}