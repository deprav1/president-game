# Исправление падения игры при переходе из VEPEAN HUB

## Problem
При нажатии на кнопку `🌐 ОТКРЫТЬ VEPEAN.CLICK →` в оверлее Хаба игра полностью падала с ошибкой `ReferenceError: openVepean is not defined`. Пользователи не могли перейти по ссылке для активации промокода.

## Root Cause
Во время предыдущего крупного рефакторинга стилей и декомпозиции кода функция `openVepean` была случайно удалена или пропущена в файле `src/App.jsx`. В JSX разметке обработчик события остался привязан к ней (`onClick={openVepean}`), что приводило к обращению к неопределенной переменной во время клика.

## Solution
1. В файл [App.jsx](file:///c:/Users/Lenovo/Desktop/PROEKTZ/president-game/president-game/src/App.jsx) прямо под функцией `openNaruzhu` добавлена аналогичная функция `openVepean`:
```javascript
  const openVepean = () => {
    const url = "https://vepean.click/?utm_source=varonia&utm_medium=game&utm_campaign=hub";
    if (window.Telegram?.WebApp) window.Telegram.WebApp.openLink(url);
    else window.open(url, "_blank");
  };
```
2. Функция безопасно открывает внешнюю ссылку `https://vepean.click` через `Telegram.WebApp.openLink` на мобильных устройствах или через обычный `window.open` на десктопных компьютерах.

## Prevention
- Впредь при удалении или изменении функций-обработчиков событий проводить статический анализ кода на наличие «висячих» вызовов в JSX.
- Всегда запускать проверку сборки `npm run build` перед отправкой изменений в репозиторий.
