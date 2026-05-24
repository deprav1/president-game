# Исправление вывода текстовых путей вместо иконок в превью решений

## Problem
При наведении на кнопки выбора параметров над головой советника вместо аккуратных иконок с числовыми эффектами выводились текстовые пути к файлам картинок, склеенные со значением (например: `/images/icon_oligarchs.png-22` или `/images/icon_people.png+10`). Это сильно захламляло игровой экран и снижало качество UI.

## Root Cause
В JSX разметке компонента игровой карты (`phase === "card"`) в блоке превью эффектов использовалась переменная `{p.icon}` непосредственно внутри тега `{p.icon}{previewFxReal[p.key] > 0 ? "+" : ""}{previewFxReal[p.key]}`. Так как `p.icon` содержит строковый путь к картинке (например, `"/images/icon_oligarchs.png"`), браузер выводил его как обычный текст.

## Solution
1. В файле [App.jsx](file:///c:/Users/Lenovo/Desktop/PROEKTZ/president-game/president-game/src/App.jsx) блок превью эффектов был полностью переписан. Теперь вместо текстового пути рендерится стильная плашка с маленьким изображением иконки шкал:
```javascript
<span key={p.key} style={{ 
  fontSize: 12, 
  fontFamily: "var(--font-sans)", 
  color: previewFxReal[p.key] > 0 ? "#27ae60" : "#c0392b", 
  animation: "fadeIn 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "rgba(26, 15, 0, 0.65)",
  padding: "2px 8px",
  borderRadius: 6,
  border: `1px solid ${previewFxReal[p.key] > 0 ? "rgba(39, 174, 96, 0.3)" : "rgba(192, 57, 43, 0.3)"}`,
  boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
}}>
  <img 
    src={getAsset(p.icon)} 
    style={{ 
      width: 14, 
      height: 14, 
      objectFit: "contain",
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6)) brightness(1.2)" 
    }} 
    alt="" 
  />
  <span style={{ fontWeight: 700 }}>
    {previewFxReal[p.key] > 0 ? "+" : ""}{previewFxReal[p.key]}
  </span>
</span>
```
2. Это решение не только убрало раздражающий баг с путями картинок, но и оформило эффекты в красивые информативные плашечки.

## Prevention
- При выводе иконок и параметров в React-компонентах всегда проверять, какой тип данных несет в себе свойство (объект, эмодзи-строка или путь).
- Использовать `<img>` для отрисовки графических путей, предварительно оборачивая их в функцию `getAsset` для корректного деплоя.
