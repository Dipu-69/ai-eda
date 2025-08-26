export default function Logo({ size = 26, withText = true }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6C5CE7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Gradient ring */}
        <circle cx="32" cy="32" r="28" fill="url(#lg)" opacity="0.18" />
        {/* Stylized 'A' */}
        <path d="M32 14 L50 50 H44 L39 40 H25 L20 50 H14 L32 14 Z M28 34h8l-4-8-4 8z" fill="currentColor" />
        {/* 'i' dot */}
        <circle cx="46" cy="18" r="3" fill="currentColor" />
      </svg>
      {withText && <span className="font-semibold tracking-tight">AI EDA</span>}
    </div>
  );
}