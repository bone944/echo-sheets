const STORAGE_KEYS = {
  characters: "echo.characters",
  activeCharacterId: "echo.activeCharacterId",
};

const repo = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEYS.characters);
    const parsed = safeParseJSON(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  },

  saveAll(data) {
    localStorage.setItem(STORAGE_KEYS.characters, JSON.stringify(data));
  },

  getActiveId() {
    const raw = localStorage.getItem(STORAGE_KEYS.activeCharacterId);
    return typeof raw === "string" && raw.trim() !== "" ? raw : null;
  },

  setActiveId(id) {
    if (!id) {
      localStorage.removeItem(STORAGE_KEYS.activeCharacterId);
      return;
    }

    localStorage.setItem(STORAGE_KEYS.activeCharacterId, id);
  },
};