export default function AchievementToast({ achievement }) {
  if (!achievement) return null;

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <span className="achievement-toast-mark" aria-hidden="true">{achievement.icon}</span>
      <span>
        <span className="achievement-toast-kicker">ДОСЬЕ ОБНОВЛЕНО</span>
        <span className="achievement-toast-title">{achievement.label}</span>
      </span>
    </div>
  );
}
