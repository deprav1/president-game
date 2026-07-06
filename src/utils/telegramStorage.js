/**
 * Обертка для Telegram CloudStorage с фолбэком на localStorage.
 * Telegram CloudStorage работает асинхронно, поэтому все методы возвращают Promise.
 */

const getCloudStorage = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg?.CloudStorage) return null;
  // CloudStorage добавлен в Bot API 6.9. На старых клиентах (и в браузере с
  // мок-версией 6.0) объект существует, но колбэки НЕ срабатывают → промис
  // зависает навсегда. Поэтому используем CloudStorage только если он реально
  // поддерживается; иначе — фолбэк на localStorage.
  if (typeof tg.isVersionAtLeast === "function" && !tg.isVersionAtLeast("6.9")) return null;
  return tg.CloudStorage;
};

export const telegramStorage = {
  /**
   * Получить значение по ключу.
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    const localFallback = () => {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    };
    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        // Страховка: если колбэк CloudStorage не сработает за 3с (зависший
        // клиент) — не блокируем работу, отдаём localStorage.
        let done = false;
        const finish = (val) => { if (!done) { done = true; resolve(val); } };
        const timer = setTimeout(() => finish(localFallback()), 3000);
        cloud.getItem(key, (err, value) => {
          clearTimeout(timer);
          if (err) {
            console.error('[CloudStorage] Error getting item:', err);
            // Если ошибка облака, пробуем достать из localStorage как запасной вариант
            finish(localFallback());
          } else {
            finish(value || null);
          }
        });
      });
    }

    // Fallback to localStorage
    return new Promise((resolve) => {
      try {
        resolve(localStorage.getItem(key));
      } catch (e) {
        resolve(null);
      }
    });
  },

  /**
   * Получить сразу несколько ключей
   * @param {string[]} keys 
   * @returns {Promise<Object>} Объект вида { key: value }
   */
  async getItems(keys) {
    const localFallback = () => {
      const result = {};
      keys.forEach(k => {
        try { result[k] = localStorage.getItem(k); } catch (e) {}
      });
      return result;
    };
    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        // Страховка: если колбэк CloudStorage не сработает за 3с (зависший
        // клиент) — не блокируем старт, отдаём localStorage.
        let done = false;
        const finish = (val) => { if (!done) { done = true; resolve(val); } };
        const timer = setTimeout(() => finish(localFallback()), 3000);
        cloud.getItems(keys, (err, values) => {
          clearTimeout(timer);
          if (err) {
            console.error('[CloudStorage] Error getting items:', err);
            finish(localFallback());
          } else {
            finish(values || {});
          }
        });
      });
    }

    // Fallback to localStorage
    return new Promise((resolve) => {
      const result = {};
      keys.forEach(k => {
        try { result[k] = localStorage.getItem(k); } catch (e) {}
      });
      resolve(result);
    });
  },

  /**
   * Записать значение
   * @param {string} key 
   * @param {string} value 
   * @returns {Promise<boolean>}
   */
  async setItem(key, value) {
    // На всякий случай дублируем в localStorage, если вдруг пользователь выйдет из телеги в браузер
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Игнорируем ошибки квоты или приватного режима
    }

    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        cloud.setItem(key, value, (err, success) => {
          if (err) {
            console.error('[CloudStorage] Error setting item:', err);
            resolve(false);
          } else {
            resolve(success);
          }
        });
      });
    }
    return Promise.resolve(true);
  },

  /**
   * Удалить ключ
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        cloud.removeItem(key, (err, success) => {
          if (err) {
            console.error('[CloudStorage] Error removing item:', err);
            resolve(false);
          } else {
            resolve(success);
          }
        });
      });
    }
    return Promise.resolve(true);
  }
};
