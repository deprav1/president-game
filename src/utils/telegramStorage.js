/**
 * Обертка для Telegram CloudStorage с фолбэком на localStorage.
 * Telegram CloudStorage работает асинхронно, поэтому все методы возвращают Promise.
 */

const getCloudStorage = () => {
  return window.Telegram?.WebApp?.CloudStorage;
};

export const telegramStorage = {
  /**
   * Получить значение по ключу.
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        cloud.getItem(key, (err, value) => {
          if (err) {
            console.error('[CloudStorage] Error getting item:', err);
            // Если ошибка облака, пробуем достать из localStorage как запасной вариант
            try {
              resolve(localStorage.getItem(key));
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(value || null);
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
    const cloud = getCloudStorage();
    if (cloud) {
      return new Promise((resolve) => {
        cloud.getItems(keys, (err, values) => {
          if (err) {
            console.error('[CloudStorage] Error getting items:', err);
            // Fallback
            const result = {};
            keys.forEach(k => {
              try { result[k] = localStorage.getItem(k); } catch (e) {}
            });
            resolve(result);
          } else {
            resolve(values || {});
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
