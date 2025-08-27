// Logo.jsx
import React from "react";

export default function Logo({ size = 26, withText = true }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="QueryLens logo"
      >
        <defs>
          <linearGradient id="qlg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />   {/* violet-600 */}
            <stop offset="100%" stopColor="#10B981" /> {/* emerald-500 */}
          </linearGradient>
        </defs>

        {/* Soft glow */}
        <circle cx="28" cy="28" r="22" fill="url(#qlg)" opacity="0.14" />

        {/* Lens ring */}
        <circle
          cx="28"
          cy="28"
          r="16"
          fill="none"
          stroke="url(#qlg)"
          strokeWidth="4"
        />

        {/* Magnifier handle */}
        <path
          d="M42 42 L52 52"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Scatter points inside the lens */}
        <circle cx="21" cy="33" r="2.2" fill="currentColor" />
        <circle cx="28" cy="26" r="2.2" fill="currentColor" />
        <circle cx="35" cy="30" r="2.2" fill="currentColor" />

        {/* Trend line connecting points */}
        <path
          d="M19 35 C23 29, 27 23, 35 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Small AI spark */}
        <path
          d="M18 14 l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"
          fill="url(#qlg)"
          opacity="0.9"
        />
      </svg>

      {withText && (
        <span className="font-semibold tracking-tight">
          QueryLens
        </span>
      )}
    </div>
  );
}