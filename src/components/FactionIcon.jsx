// Векторные иконки фракций — чистый SVG, прозрачный фон, currentColor.
// Встраиваются в любом месте и на любом размере без «квадрата» и градиентов.
//  oligarchs → стопка монет · army → медаль · people → колонна · west → щит
export default function FactionIcon({ type, className = "", style }) {
  const s = {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: "false",
  };
  const sw = 1.5;

  if (type === "oligarchs") {
    // Стопка монет (казна/олигархи)
    return (
      <svg {...s}>
        <ellipse cx="12" cy="7.5" rx="6.2" ry="2.3" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth={sw} />
        <path d="M5.8 7.5v8.8c0 1.27 2.78 2.3 6.2 2.3s6.2-1.03 6.2-2.3V7.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        <path d="M5.8 11.9c0 1.27 2.78 2.3 6.2 2.3s6.2-1.03 6.2-2.3" stroke="currentColor" strokeWidth={sw} />
        <path d="m12 5.7.86 1.36 1.54-.38-.86 1.34.86 1.34-1.54-.38L12 10.66l-.86-1.36-1.54.38.86-1.34-.86-1.34 1.54.38z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "army") {
    // Медаль на ленте (силовики/лояльность)
    return (
      <svg {...s}>
        <path d="M9 3.3 12 9l3-5.7" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" fill="currentColor" fillOpacity="0.14" />
        <circle cx="12" cy="14.6" r="5.1" stroke="currentColor" strokeWidth={sw} fill="currentColor" fillOpacity="0.1" />
        <path d="m12 11.1 1.03 2.08 2.3.34-1.66 1.62.39 2.29L12 18.44l-2.05 1.08.39-2.29-1.66-1.62 2.3-.34z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "people") {
    // Классическая колонна (народ/стабильность)
    return (
      <svg {...s}>
        <path d="M5.5 5.4h13M7 5.4v2h10v-2" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
        <path d="M8.4 7.6v8.8M12 7.6v8.8M15.6 7.6v8.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
        <path d="M6.6 16.4h10.8l1.1 2.2H5.5z" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "west") {
    // Расколотый щит (Запад/репутация)
    return (
      <svg {...s}>
        <path d="M12 3.2 19 5.6v5.3c0 4.1-2.7 7.2-7 9.1-4.3-1.9-7-5-7-9.1V5.6z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" fill="currentColor" fillOpacity="0.1" />
        <path d="M12 3.6 11 7l2 2.4-2 2.2 1.4 2.6-1.2 2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      </svg>
    );
  }

  // Герб по умолчанию — звезда с лаврами
  return (
    <svg {...s}>
      <path d="M12 3.4 14.35 8l5.05.75-3.7 3.58.88 5.03L12 14.98 7.42 17.36l.88-5.03-3.7-3.58L9.65 8 12 3.4Z" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
      <path d="M7.1 11.4H3.3c1.2 1.55 2.75 2.55 4.65 3M16.9 11.4h3.8c-1.2 1.55-2.75 2.55-4.65 3" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3.4 13.35 8h-2.7L12 3.4Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}
