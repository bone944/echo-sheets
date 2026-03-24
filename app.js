const STORAGE_KEYS = {
  characters: "echo.characters",
  activeCharacterId: "echo.activeCharacterId",
};

const DEFAULT_PP_MAX = 12;

const state = {
  characters: [],
  activeId: null,
  abilitiesCatalog: [],
  talentsCatalog: [],
  ui: {
    abilitiesEditMode: false,
    talentsEditMode: false,
    currentArea: null, // "player" | "gm" | null
  },
};

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeParseJSON(value, fallback) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function toInt(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function truncateHalf(value) {
  return Math.trunc(value / 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createEmptyCharacter() {
  return {
    id: generateId("char"),
    name: "Nuovo personaggio",
    profileType: "player",
    ppMax: DEFAULT_PP_MAX,

    stats: {
      vigore: 0,
      agilita: 0,
      ingegno: 0,
      spirito: 0,
    },

    abilities: [
      {
        abilityId: "",
        spentPoints: 0,
      },
    ],

    talents: [
      {
        family: "",
        rank: 0,
      },
    ],

    inventory: [],
    weapons: [],

    magic: {
      techniqueId: null,
      formId: null,
    },

    wealth: {
      initialLevel: 0,
      currentLevel: 0,
      rewards: [],
    },

    conditions: [],

    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function normalizeCharacter(raw) {
  if (!raw || typeof raw !== "object") {
    return createEmptyCharacter();
  }

  return {
    id: raw.id || generateId("char"),
    name: raw.name || "Nuovo personaggio",
    profileType: raw.profileType || "player",
    ppMax: toInt(raw.ppMax, DEFAULT_PP_MAX),

    stats: {
      vigore: toInt(raw?.stats?.vigore, 0),
      agilita: toInt(raw?.stats?.agilita, 0),
      ingegno: toInt(raw?.stats?.ingegno, 0),
      spirito: toInt(raw?.stats?.spirito, 0),
    },

    abilities: Array.isArray(raw.abilities) && raw.abilities.length > 0
      ? raw.abilities.map((row) => ({
          abilityId: row?.abilityId || "",
          spentPoints: toInt(row?.spentPoints, 0),
        }))
      : [
          {
            abilityId: "",
            spentPoints: 0,
          },
        ],

    talents: Array.isArray(raw.talents) && raw.talents.length > 0
      ? raw.talents.map((row) => ({
          family: row?.family || "",
          rank: toInt(row?.rank, 0),
        }))
      : [
          {
            family: "",
            rank: 0,
          },
        ],

    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    weapons: Array.isArray(raw.weapons) ? raw.weapons : [],

    magic: {
      techniqueId: raw?.magic?.techniqueId ?? null,
      formId: raw?.magic?.formId ?? null,
    },

    wealth: {
      initialLevel: toInt(raw?.wealth?.initialLevel, 0),
      currentLevel: toInt(raw?.wealth?.currentLevel, 0),
      rewards: Array.isArray(raw?.wealth?.rewards) ? raw.wealth.rewards : [],
    },

    conditions: Array.isArray(raw.conditions) ? raw.conditions : [],

    meta: {
      createdAt: raw?.meta?.createdAt || new Date().toISOString(),
      updatedAt: raw?.meta?.updatedAt || new Date().toISOString(),
    },
  };
}

function calculateDerived(character) {
  const { vigore, agilita, ingegno, spirito } = character.stats;

  const tempra = truncateHalf(vigore);
  const evasione = truncateHalf(agilita);
  const mente = truncateHalf(ingegno);
  const risolutezza = truncateHalf(spirito);

  const statsCost = 4 * (vigore + agilita + ingegno + spirito);
  const abilitiesCost = (character.abilities || []).reduce(
    (sum, row) => sum + toInt(row.spentPoints, 0),
    0
  );

  const talentsCost = (character.talents || []).reduce((sum, row) => {
    const talentInfo = getTalentSelectionInfo(row);
    return sum + talentInfo.cost;
  }, 0);

  return {
    tempra,
    evasione,
    mente,
    risolutezza,
    ppSpent: statsCost + abilitiesCost + talentsCost,
  };
}

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

const dom = {
  screens: {
    role: document.getElementById("screen-role"),
    home: document.getElementById("screen-home"),
    gm: document.getElementById("screen-gm"),
    editor: document.getElementById("screen-editor"),
  },

  roleCards: document.querySelectorAll(".role-card"),

  list: document.getElementById("characterList"),
  empty: document.getElementById("emptyState"),

  buttons: {
    newChar: document.getElementById("newCharacterButton"),
    save: document.getElementById("saveCharacterButton"),
    home: document.getElementById("goHomeButton"),

    addAbilityRow: document.getElementById("addAbilityRowButton"),
    toggleAbilitiesEdit: document.getElementById("toggleAbilitiesEdit"),

    addTalentRow: document.getElementById("addTalentRowButton"),
    toggleTalentsEdit: document.getElementById("toggleTalentsEdit"),

    duplicateCharacter: document.getElementById("duplicateCharacterButton"),
    deleteCharacter: document.getElementById("deleteCharacterButton"),
  },

  labels: {
    currentRole: document.getElementById("currentRoleLabel"),
    storageMode: document.getElementById("storageModeLabel"),
    saveStatus: document.getElementById("saveStatusMessage"),
  },

  editor: {
    name: document.getElementById("characterName"),
    type: document.getElementById("characterType"),
    ppMax: document.getElementById("ppMax"),

    vigore: document.getElementById("vigore"),
    agilita: document.getElementById("agilita"),
    ingegno: document.getElementById("ingegno"),
    spirito: document.getElementById("spirito"),
  },

  output: {
    tempra: document.getElementById("tempra"),
    evasione: document.getElementById("evasione"),
    mente: document.getElementById("mente"),
    risolutezza: document.getElementById("risolutezza"),
    ppSpent: document.getElementById("ppSpent"),
    ppMax: document.getElementById("ppMaxDisplay"),

    tempraLarge: document.getElementById("tempraLarge"),
    evasioneLarge: document.getElementById("evasioneLarge"),
    menteLarge: document.getElementById("menteLarge"),
    risolutezzaLarge: document.getElementById("risolutezzaLarge"),
  },

  abilitiesList: document.getElementById("abilitiesList"),
  abilitiesControls: document.getElementById("abilitiesControls"),

  talentsList: document.getElementById("talentsList"),
  talentsControls: document.getElementById("talentsControls"),
};

function getActiveChar() {
  return state.characters.find((c) => c.id === state.activeId) || null;
}

function show(screen) {
  Object.values(dom.screens).forEach((s) => s.classList.remove("screen--active"));
  if (dom.screens[screen]) {
    dom.screens[screen].classList.add("screen--active");
  }
}

function openRoleScreen() {
  state.ui.currentArea = null;
  show("role");
}

function openPlayerHome() {
  state.ui.currentArea = "player";
  dom.labels.currentRole.textContent = "Giocatore";
  show("home");
  renderList();
}

function openGMHome() {
  state.ui.currentArea = "gm";
  dom.labels.currentRole.textContent = "GM";
  show("gm");
}

function saveAll() {
  repo.saveAll(state.characters);
  repo.setActiveId(state.activeId);
}

function findAbilityById(abilityId) {
  return state.abilitiesCatalog.find((a) => a.id === abilityId) || null;
}

function getSelectedAbilityIds(character, excludeRowIndex = -1) {
  return (character.abilities || [])
    .map((row, index) => (index === excludeRowIndex ? "" : row.abilityId))
    .filter(Boolean);
}

function getAvailableAbilitiesForRow(character, rowIndex) {
  const currentAbilityId = character.abilities[rowIndex]?.abilityId || "";
  const takenIds = new Set(getSelectedAbilityIds(character, rowIndex));

  return [...state.abilitiesCatalog]
    .filter((ability) => !takenIds.has(ability.id) || ability.id === currentAbilityId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

function buildAbilityOptions(character, rowIndex, selectedId = "") {
  const options = ['<option value="">Seleziona abilità</option>'];

  getAvailableAbilitiesForRow(character, rowIndex).forEach((ability) => {
    const selected = ability.id === selectedId ? "selected" : "";
    options.push(
      `<option value="${escapeHtml(ability.id)}" ${selected}>${escapeHtml(ability.nome)}</option>`
    );
  });

  return options.join("");
}

function calculateAbilityRow(character, row) {
  const ability = findAbilityById(row.abilityId);

  if (!ability) {
    return {
      categoria: "—",
      diff: "—",
      car: "—",
      pool: "0d6",
      cap: "—",
      overCap: false,
      canIncrease: false,
      canDecrease: false,
    };
  }

  const spentPoints = toInt(row.spentPoints, 0);
  const poolTotal = ability.poolBase + spentPoints;
  const overCap = spentPoints > ability.cap;

  return {
    categoria: ability.categoria,
    diff: ability.diff,
    car: ability.car,
    pool: `${poolTotal}d6`,
    cap: ability.cap,
    overCap,
    canIncrease: spentPoints < ability.cap,
    canDecrease: spentPoints > 0,
  };
}

function getStatValueByName(character, statName) {
  const normalized = String(statName || "").trim().toLowerCase();

  if (normalized === "vigore") return toInt(character.stats.vigore, 0);
  if (normalized === "agilità" || normalized === "agilita") return toInt(character.stats.agilita, 0);
  if (normalized === "ingegno") return toInt(character.stats.ingegno, 0);
  if (normalized === "spirito") return toInt(character.stats.spirito, 0);

  return 0;
}

function meetsTalentPrerequisite(character, family) {
  const variants = state.talentsCatalog.filter((t) => t.family === family);
  if (variants.length === 0) return false;

  const sample = variants[0];
  const prereqType = sample.prereqType;
  const prereqTarget = sample.prereqTarget;
  const prereqValue = toInt(sample.prereqValue, 0);

  if (!prereqType) return true;

  if (prereqType === "stat_min") {
    return getStatValueByName(character, prereqTarget) >= prereqValue;
  }

  if (prereqType === "ability_pp") {
    const ability = state.abilitiesCatalog.find(
      (a) => a.nome.trim().toLowerCase() === String(prereqTarget || "").trim().toLowerCase()
    );

    if (!ability) return false;

    const ownedRow = (character.abilities || []).find((row) => row.abilityId === ability.id);
    const spent = ownedRow ? toInt(ownedRow.spentPoints, 0) : 0;
    return spent >= prereqValue;
  }

  return false;
}

function getAvailableTalentFamilies(character, excludeRowIndex = -1) {
  const currentFamily = character.talents[excludeRowIndex]?.family || "";
  const takenFamilies = new Set(
    (character.talents || [])
      .map((row, index) => (index === excludeRowIndex ? "" : row.family))
      .filter(Boolean)
  );

  const familyMap = new Map();

  state.talentsCatalog.forEach((row) => {
    if (!familyMap.has(row.family)) {
      familyMap.set(row.family, row);
    }
  });

  return [...familyMap.values()]
    .filter((row) => meetsTalentPrerequisite(character, row.family))
    .filter((row) => !takenFamilies.has(row.family) || row.family === currentFamily)
    .sort((a, b) => a.family.localeCompare(b.family, "it"));
}

function buildTalentOptions(character, rowIndex, selectedFamily = "") {
  const options = ['<option value="">Seleziona talento</option>'];

  getAvailableTalentFamilies(character, rowIndex).forEach((talent) => {
    const selected = talent.family === selectedFamily ? "selected" : "";
    options.push(
      `<option value="${escapeHtml(talent.family)}" ${selected}>${escapeHtml(talent.family)}</option>`
    );
  });

  return options.join("");
}

function getTalentVariantsByFamily(family) {
  return state.talentsCatalog
    .filter((row) => row.family === family)
    .sort((a, b) => a.rank - b.rank);
}

function getTalentSelectionInfo(row) {
  if (!row?.family) {
    return {
      type: "none",
      cost: 0,
      fp: "—",
      rank: 0,
      canIncrease: false,
      canDecrease: false,
      minRank: 0,
      maxRank: 0,
    };
  }

  const variants = getTalentVariantsByFamily(row.family);
  if (variants.length === 0) {
    return {
      type: "none",
      cost: 0,
      fp: "—",
      rank: 0,
      canIncrease: false,
      canDecrease: false,
      minRank: 0,
      maxRank: 0,
    };
  }

  const type = variants[0].type;
  const minRank = variants[0].rankMin;
  const maxRank = variants[0].rankMax;
  const currentRank = toInt(row.rank, type === "fixed" ? 1 : minRank);
  const currentVariant = variants.find((v) => v.rank === currentRank) || variants[0];

  return {
    type,
    cost: currentVariant.cost,
    fp: currentVariant.fp,
    rank: currentRank,
    canIncrease: type === "ranked" && currentRank < maxRank,
    canDecrease: type === "ranked" && currentRank > minRank,
    minRank,
    maxRank,
  };
}

function renderList() {
  dom.list.innerHTML = "";

  if (!Array.isArray(state.characters) || state.characters.length === 0) {
    dom.empty.classList.remove("hidden");
    return;
  }

  dom.empty.classList.add("hidden");

  state.characters.forEach((c) => {
    const d = calculateDerived(c);

    const el = document.createElement("div");
    el.className = "character-card";

    el.innerHTML = `
      <div>
        <strong>${escapeHtml(c.name)}</strong><br>
        <small>${escapeHtml(c.profileType)} · PP ${d.ppSpent}/${c.ppMax}</small>
      </div>
      <div class="character-card__actions">
        <button class="btn btn--primary" data-id="${escapeHtml(c.id)}" data-action="open">Apri</button>
      </div>
    `;

    dom.list.appendChild(el);
  });
}

function renderAbilities() {
  const character = getActiveChar();
  if (!character || !dom.abilitiesList) return;

  dom.abilitiesList.innerHTML = "";

  (character.abilities || []).forEach((row, index) => {
    const computed = calculateAbilityRow(character, row);
    const abilityExists = !!row.abilityId;

    const rowEl = document.createElement("div");
    rowEl.className = `ability-card${computed.overCap ? " is-danger" : ""}`;
    rowEl.dataset.rowIndex = index;

    rowEl.innerHTML = `
      <div class="ability-card__top">
        <div class="field-group ability-card__name">
          <label>Abilità</label>
          <select class="ability-name" data-row-index="${index}" ${state.ui.abilitiesEditMode ? "" : "disabled"}>
            ${buildAbilityOptions(character, index, row.abilityId)}
          </select>
          <span class="ability-card__category">${escapeHtml(computed.categoria)}</span>
        </div>

        <div class="ability-card__pool-wrap">
          <span class="ability-card__pool-label">Pool</span>
          <span class="ability-pool ability-card__pool">${computed.pool}</span>
        </div>
      </div>

      <div class="ability-card__bottom">
        <div class="field-group ability-card__pp">
          <label>PP</label>
          <div class="ability-card__pp-controls">
            <button
              class="ability-stepper ability-stepper--minus"
              data-row-index="${index}"
              type="button"
              ${!state.ui.abilitiesEditMode || !computed.canDecrease ? "disabled" : ""}
            >−</button>

            <div class="ability-card__pp-value">${toInt(row.spentPoints, 0)}</div>

            <button
              class="ability-stepper ability-stepper--plus"
              data-row-index="${index}"
              type="button"
              ${!state.ui.abilitiesEditMode || !computed.canIncrease ? "disabled" : ""}
            >+</button>
          </div>
        </div>

        <div class="ability-mini-box">
          <span class="ability-mini-box__label">Diff</span>
          <span class="ability-diff">${computed.diff}</span>
        </div>

        <div class="ability-mini-box">
          <span class="ability-mini-box__label">Car</span>
          <span class="ability-car">${computed.car}</span>
        </div>

        <div class="ability-mini-box">
          <span class="ability-mini-box__label">Cap</span>
          <span class="ability-cap">${computed.cap}</span>
        </div>

        <div class="ability-card__actions ${state.ui.abilitiesEditMode ? "" : "hidden"}">
          <button
            class="icon-btn icon-btn--danger ability-delete"
            data-row-index="${index}"
            type="button"
            ${character.abilities.length <= 1 && !abilityExists ? "disabled" : ""}
            title="Elimina riga"
          >🗑</button>
        </div>
      </div>
    `;

    dom.abilitiesList.appendChild(rowEl);
  });

  if (dom.abilitiesControls) {
    dom.abilitiesControls.classList.toggle("hidden", !state.ui.abilitiesEditMode);
  }

  if (dom.buttons.toggleAbilitiesEdit) {
    dom.buttons.toggleAbilitiesEdit.textContent = state.ui.abilitiesEditMode ? "Fine modifica" : "Modifica";
  }
}

function renderTalents() {
  const character = getActiveChar();
  if (!character || !dom.talentsList) return;

  dom.talentsList.innerHTML = "";

  (character.talents || []).forEach((row, index) => {
    const info = getTalentSelectionInfo(row);
    const talentExists = !!row.family;
    const isRanked = info.type === "ranked";

    const rowEl = document.createElement("div");
    rowEl.className = "talent-card";
    rowEl.dataset.rowIndex = index;

    rowEl.innerHTML = `
      <div class="talent-card__top">
        <div class="field-group talent-card__name">
          <label>Talento</label>
          <select class="talent-family" data-row-index="${index}" ${state.ui.talentsEditMode ? "" : "disabled"}>
            ${buildTalentOptions(character, index, row.family)}
          </select>
        </div>

        <div class="talent-card__cost-wrap">
          <span class="talent-card__cost-label">Costo</span>
          <span class="talent-card__cost">${info.cost} PP</span>
        </div>
      </div>

      <div class="talent-card__meta">
        <div class="ability-mini-box">
          <span class="ability-mini-box__label">FP</span>
          <span>${info.fp}</span>
        </div>

        <div class="ability-mini-box">
          <span class="ability-mini-box__label">Tipo</span>
          <span>${info.type === "ranked" ? "Rango" : talentExists ? "Fisso" : "—"}</span>
        </div>

        <div>
          ${
            isRanked
              ? `
                <span class="ability-mini-box__label">Rango</span>
                <div class="talent-card__rank-controls">
                  <button
                    class="ability-stepper talent-stepper--minus"
                    data-row-index="${index}"
                    type="button"
                    ${!state.ui.talentsEditMode || !info.canDecrease ? "disabled" : ""}
                  >−</button>

                  <div class="talent-card__rank-value">${info.rank}</div>

                  <button
                    class="ability-stepper talent-stepper--plus"
                    data-row-index="${index}"
                    type="button"
                    ${!state.ui.talentsEditMode || !info.canIncrease ? "disabled" : ""}
                  >+</button>
                </div>
              `
              : `
                <div class="ability-mini-box">
                  <span class="ability-mini-box__label">Rango</span>
                  <span>${talentExists ? "1" : "—"}</span>
                </div>
              `
          }
        </div>

        <div class="talent-card__actions ${state.ui.talentsEditMode ? "" : "hidden"}">
          <button
            class="icon-btn icon-btn--danger talent-delete"
            data-row-index="${index}"
            type="button"
            ${character.talents.length <= 1 && !talentExists ? "disabled" : ""}
            title="Elimina riga"
          >🗑</button>
        </div>
      </div>
    `;

    dom.talentsList.appendChild(rowEl);
  });

  if (dom.talentsControls) {
    dom.talentsControls.classList.toggle("hidden", !state.ui.talentsEditMode);
  }

  if (dom.buttons.toggleTalentsEdit) {
    dom.buttons.toggleTalentsEdit.textContent = state.ui.talentsEditMode ? "Fine modifica" : "Modifica";
  }
}

function renderEditor() {
  const c = getActiveChar();
  if (!c) return;

  const d = calculateDerived(c);

  dom.editor.name.value = c.name;
  dom.editor.type.value = c.profileType;
  dom.editor.ppMax.value = c.ppMax;

  dom.editor.vigore.value = c.stats.vigore;
  dom.editor.agilita.value = c.stats.agilita;
  dom.editor.ingegno.value = c.stats.ingegno;
  dom.editor.spirito.value = c.stats.spirito;

  dom.output.tempra.textContent = d.tempra;
  dom.output.evasione.textContent = d.evasione;
  dom.output.mente.textContent = d.mente;
  dom.output.risolutezza.textContent = d.risolutezza;
  dom.output.ppSpent.textContent = d.ppSpent;
  dom.output.ppMax.textContent = c.ppMax;

  dom.output.tempraLarge.textContent = d.tempra;
  dom.output.evasioneLarge.textContent = d.evasione;
  dom.output.menteLarge.textContent = d.mente;
  dom.output.risolutezzaLarge.textContent = d.risolutezza;

  dom.output.ppSpent.classList.toggle("text-danger", d.ppSpent > c.ppMax);
  dom.output.ppMax.classList.toggle("text-danger", d.ppSpent > c.ppMax);

  dom.labels.saveStatus.textContent =
    d.ppSpent > c.ppMax
      ? "Attenzione: i PP spesi superano i PP Max."
      : "Modifiche salvate localmente.";

  renderAbilities();
  renderTalents();
}

function updateChar() {
  const c = getActiveChar();
  if (!c) return;

  c.name = dom.editor.name.value.trim() || "Nuovo personaggio";
  c.profileType = dom.editor.type.value;
  c.ppMax = toInt(dom.editor.ppMax.value, DEFAULT_PP_MAX);

  c.stats.vigore = toInt(dom.editor.vigore.value, 0);
  c.stats.agilita = toInt(dom.editor.agilita.value, 0);
  c.stats.ingegno = toInt(dom.editor.ingegno.value, 0);
  c.stats.spirito = toInt(dom.editor.spirito.value, 0);

  c.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderList();
  renderEditor();
}

function createChar() {
  const c = createEmptyCharacter();
  state.characters.push(c);
  state.activeId = c.id;
  saveAll();
  renderList();
  renderEditor();
  show("editor");
}

function duplicateCharacter() {
  const current = getActiveChar();
  if (!current) return;

  const clone = JSON.parse(JSON.stringify(current));
  clone.id = generateId("char");
  clone.name = `${current.name} (Copia)`;
  clone.meta.createdAt = new Date().toISOString();
  clone.meta.updatedAt = new Date().toISOString();

  state.characters.push(clone);
  state.activeId = clone.id;
  saveAll();
  renderList();
  renderEditor();
  show("editor");
}

function deleteCharacter() {
  const current = getActiveChar();
  if (!current) return;

  const ok = window.confirm(`Vuoi davvero eliminare "${current.name}"?`);
  if (!ok) return;

  state.characters = state.characters.filter((c) => c.id !== current.id);
  state.activeId = state.characters.length ? state.characters[0].id : null;

  saveAll();
  renderList();

  if (state.activeId) {
    renderEditor();
    show("editor");
  } else {
    openPlayerHome();
  }
}

function handleAbilityChange(event) {
  const character = getActiveChar();
  if (!character) return;

  const select = event.target.closest(".ability-name");
  if (!select) return;

  const rowIndex = toInt(select.dataset.rowIndex, 0);

  if (!character.abilities[rowIndex]) {
    character.abilities[rowIndex] = { abilityId: "", spentPoints: 0 };
  }

  character.abilities[rowIndex].abilityId = select.value;
  character.abilities[rowIndex].spentPoints = Math.max(
    0,
    Math.min(
      toInt(character.abilities[rowIndex].spentPoints, 0),
      toInt(findAbilityById(select.value)?.cap, 0)
    )
  );

  character.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderEditor();
  renderList();
}

function changeAbilityPoints(rowIndex, delta) {
  const character = getActiveChar();
  if (!character) return;
  if (!character.abilities[rowIndex]) return;

  const row = character.abilities[rowIndex];
  const ability = findAbilityById(row.abilityId);
  if (!ability) return;

  const current = toInt(row.spentPoints, 0);
  const next = current + delta;

  if (next < 0) return;
  if (next > ability.cap) return;

  row.spentPoints = next;
  character.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderEditor();
  renderList();
}

function addAbilityRow() {
  const character = getActiveChar();
  if (!character) return;

  const lastRow = character.abilities[character.abilities.length - 1];
  if (lastRow && !lastRow.abilityId) return;

  character.abilities.push({
    abilityId: "",
    spentPoints: 0,
  });

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
}

function deleteAbilityRow(rowIndex) {
  const character = getActiveChar();
  if (!character) return;
  if (!character.abilities[rowIndex]) return;

  character.abilities.splice(rowIndex, 1);

  if (character.abilities.length === 0) {
    character.abilities.push({
      abilityId: "",
      spentPoints: 0,
    });
  }

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
  renderList();
}

function toggleAbilitiesEditMode() {
  state.ui.abilitiesEditMode = !state.ui.abilitiesEditMode;
  renderAbilities();
}

function handleTalentFamilyChange(event) {
  const character = getActiveChar();
  if (!character) return;

  const select = event.target.closest(".talent-family");
  if (!select) return;

  const rowIndex = toInt(select.dataset.rowIndex, 0);

  if (!character.talents[rowIndex]) {
    character.talents[rowIndex] = { family: "", rank: 0 };
  }

  const family = select.value;
  character.talents[rowIndex].family = family;

  if (!family) {
    character.talents[rowIndex].rank = 0;
  } else {
    const variants = getTalentVariantsByFamily(family);
    const first = variants[0];
    character.talents[rowIndex].rank = first ? first.rankMin : 1;
  }

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
  renderList();
}

function changeTalentRank(rowIndex, delta) {
  const character = getActiveChar();
  if (!character) return;
  if (!character.talents[rowIndex]) return;

  const row = character.talents[rowIndex];
  if (!row.family) return;

  const info = getTalentSelectionInfo(row);
  if (info.type !== "ranked") return;

  const next = info.rank + delta;
  if (next < info.minRank) return;
  if (next > info.maxRank) return;

  row.rank = next;
  character.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderEditor();
  renderList();
}

function addTalentRow() {
  const character = getActiveChar();
  if (!character) return;

  const lastRow = character.talents[character.talents.length - 1];
  if (lastRow && !lastRow.family) return;

  character.talents.push({
    family: "",
    rank: 0,
  });

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
}

function deleteTalentRow(rowIndex) {
  const character = getActiveChar();
  if (!character) return;
  if (!character.talents[rowIndex]) return;

  character.talents.splice(rowIndex, 1);

  if (character.talents.length === 0) {
    character.talents.push({
      family: "",
      rank: 0,
    });
  }

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
  renderList();
}

function toggleTalentsEditMode() {
  state.ui.talentsEditMode = !state.ui.talentsEditMode;
  renderTalents();
}

function detectDelimiter(firstLine) {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons >= commas && semicolons >= tabs) return ";";
  if (tabs >= commas && tabs >= semicolons) return "\t";
  return ",";
}

function parseCSVLine(line, delimiter) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCSV(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const dataRows = lines.slice(1);

  return dataRows.map((line) => {
    const values = parseCSVLine(line, delimiter);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record;
  });
}

async function loadAbilitiesCatalog() {
  const response = await fetch("./data/abilita.csv");

  if (!response.ok) {
    throw new Error(`Impossibile caricare abilita.csv (${response.status})`);
  }

  const csvText = await response.text();
  const parsed = parseCSV(csvText);

  state.abilitiesCatalog = parsed
    .map((row) => ({
      id: row.ID,
      categoria: row.Categoria,
      nome: row.Nome,
      diff: row.Diff,
      car: row.Caratteristica,
      poolBase: toInt(row["Pool Base"], 0),
      cap: toInt(row.Cap, 0),
      kit: row.Kit === "TRUE",
      core: row.Core === "TRUE",
    }))
    .filter((row) => row.id && row.nome)
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

async function loadTalentsCatalog() {
  const response = await fetch("./data/talenti.csv");

  if (!response.ok) {
    throw new Error(`Impossibile caricare talenti.csv (${response.status})`);
  }

  const csvText = await response.text();
  const parsed = parseCSV(csvText);

  state.talentsCatalog = parsed
    .map((row) => ({
      id: row.ID,
      nome: row.Nome,
      family: row.Famiglia,
      type: row.Tipo,
      rank: toInt(row.Rank, 1),
      rankMin: toInt(row["Rank Min"], 1),
      rankMax: toInt(row["Rank Max"], 1),
      cost: toInt(row.Costo, 0),
      fp: toInt(row.FP, 0),
      prereqType: row.Prereq_Type,
      prereqTarget: row.Prereq_Target,
      prereqValue: row.Prereq_Value,
    }))
    .filter((row) => row.id && row.family);
}

function bindEvents() {
  dom.roleCards.forEach((card) => {
    card.addEventListener("click", () => {
      const role = card.dataset.role;

      if (role === "player") {
        openPlayerHome();
      }

      if (role === "gm") {
        openGMHome();
      }
    });
  });

  dom.buttons.newChar.onclick = createChar;
  dom.buttons.save.onclick = updateChar;
  dom.buttons.home.onclick = openRoleScreen;

  dom.buttons.addAbilityRow.onclick = addAbilityRow;
  dom.buttons.toggleAbilitiesEdit.onclick = toggleAbilitiesEditMode;

  dom.buttons.addTalentRow.onclick = addTalentRow;
  dom.buttons.toggleTalentsEdit.onclick = toggleTalentsEditMode;

  dom.buttons.duplicateCharacter.onclick = duplicateCharacter;
  dom.buttons.deleteCharacter.onclick = deleteCharacter;

  dom.list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "open") {
      state.activeId = button.dataset.id;
      saveAll();
      renderEditor();
      show("editor");
    }
  });

  [
    dom.editor.name,
    dom.editor.type,
    dom.editor.ppMax,
    dom.editor.vigore,
    dom.editor.agilita,
    dom.editor.ingegno,
    dom.editor.spirito,
  ].forEach((el) => {
    el.addEventListener("input", updateChar);
    el.addEventListener("change", updateChar);
  });

  dom.abilitiesList.addEventListener("change", (event) => {
    if (event.target.matches(".ability-name")) {
      handleAbilityChange(event);
    }
  });

  dom.abilitiesList.addEventListener("click", (event) => {
    const plusBtn = event.target.closest(".ability-stepper--plus");
    const minusBtn = event.target.closest(".ability-stepper--minus");
    const deleteBtn = event.target.closest(".ability-delete");

    if (plusBtn) {
      changeAbilityPoints(toInt(plusBtn.dataset.rowIndex, 0), +1);
      return;
    }

    if (minusBtn) {
      changeAbilityPoints(toInt(minusBtn.dataset.rowIndex, 0), -1);
      return;
    }

    if (deleteBtn) {
      deleteAbilityRow(toInt(deleteBtn.dataset.rowIndex, 0));
    }
  });

  dom.talentsList.addEventListener("change", (event) => {
    if (event.target.matches(".talent-family")) {
      handleTalentFamilyChange(event);
    }
  });

  dom.talentsList.addEventListener("click", (event) => {
    const plusBtn = event.target.closest(".talent-stepper--plus");
    const minusBtn = event.target.closest(".talent-stepper--minus");
    const deleteBtn = event.target.closest(".talent-delete");

    if (plusBtn) {
      changeTalentRank(toInt(plusBtn.dataset.rowIndex, 0), +1);
      return;
    }

    if (minusBtn) {
      changeTalentRank(toInt(minusBtn.dataset.rowIndex, 0), -1);
      return;
    }

    if (deleteBtn) {
      deleteTalentRow(toInt(deleteBtn.dataset.rowIndex, 0));
    }
  });
}

function initState() {
  const loadedCharacters = repo.getAll();
  const loadedActiveId = repo.getActiveId();

  state.characters = Array.isArray(loadedCharacters)
    ? loadedCharacters.map(normalizeCharacter)
    : [];

  state.activeId =
    typeof loadedActiveId === "string" && loadedActiveId.trim() !== ""
      ? loadedActiveId
      : null;

  if (state.activeId && !state.characters.some((c) => c && c.id === state.activeId)) {
    state.activeId = null;
  }

  if (!state.activeId && state.characters.length > 0) {
    state.activeId = state.characters[0].id;
  }
}

async function init() {
  initState();
  bindEvents();

  dom.labels.currentRole.textContent = "Giocatore";
  dom.labels.storageMode.textContent = "Locale";

  await loadAbilitiesCatalog();
  await loadTalentsCatalog();

  renderList();
  show("role");
}

init().catch((error) => {
  console.error(error);
  alert("Errore reale: " + error.message);
});
