// Векторная иконка фракции/статуса (чистый SVG, currentColor наследует цвет).
export default function FactionIcon({ type, className = "", style }) {
  const shared = {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: "false",
  };

  if (type === "oligarchs") {
    return (
      <svg {...shared}>
        <path d="M12 3.5 19 9l-7 11.5L5 9l7-5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5 9h14M8.2 9 12 20.5 15.8 9M9.4 6.2h5.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 3.5 14.6 9H9.4L12 3.5Z" fill="currentColor" opacity="0.22" />
      </svg>
    );
  }

  if (type === "army") {
    return (
      <svg {...shared}>
        <path d="M12 3.4 18.5 6v5.4c0 4.1-2.45 7.15-6.5 9.2-4.05-2.05-6.5-5.1-6.5-9.2V6L12 3.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8.7 11.3 11 13.6l4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 5.6v12.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.42" />
      </svg>
    );
  }

  if (type === "people") {
    return (
      <svg {...shared}>
        <path d="M12 11.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.55" />
        <path d="M6.8 19.2c.55-3.25 2.35-5.05 5.2-5.05s4.65 1.8 5.2 5.05" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
        <path d="M5.9 12.6a2.3 2.3 0 1 0-.1-4.6 2.3 2.3 0 0 0 .1 4.6ZM18.1 12.6a2.3 2.3 0 1 0 .1-4.6 2.3 2.3 0 0 0-.1 4.6Z" stroke="currentColor" strokeWidth="1.35" opacity="0.85" />
        <path d="M2.9 18.1c.35-2.35 1.6-3.7 3.6-3.85M21.1 18.1c-.35-2.35-1.6-3.7-3.6-3.85" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.85" />
      </svg>
    );
  }

  if (type === "west") {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.65" />
        <path d="M3.8 12h16.4M12 3.8c2.15 2.15 3.2 4.85 3.2 8.2s-1.05 6.05-3.2 8.2M12 3.8C9.85 5.95 8.8 8.65 8.8 12s1.05 6.05 3.2 8.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M5.6 7.2c1.75.8 3.9 1.2 6.4 1.2s4.65-.4 6.4-1.2M5.6 16.8c1.75-.8 3.9-1.2 6.4-1.2s4.65.4 6.4 1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.58" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path d="M12 3.4 14.35 8l5.05.75-3.7 3.58.88 5.03L12 14.98 7.42 17.36l.88-5.03-3.7-3.58L9.65 8 12 3.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.1 11.4H3.3c1.2 1.55 2.75 2.55 4.65 3M16.9 11.4h3.8c-1.2 1.55-2.75 2.55-4.65 3" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3.4 13.35 8h-2.7L12 3.4Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}
