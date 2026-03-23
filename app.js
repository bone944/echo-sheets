const STORAGE_KEYS = {
  characters: "echo.characters",
  activeCharacterId: "echo.activeCharacterId",
};

const DEFAULT_PP_MAX = 12;

const state = {
  characters: [],
  activeId: null,
  abilitiesCatalog: [],
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

    talents: [],
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

    talents: Array.isArray(raw.talents) ? raw.talents : [],
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

  return {
    tempra,
    evasione,
    mente,
    risolutezza,
    ppSpent: statsCost + abilitiesCost,
  };
}

const repo = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEYS.characters);
    const parsed = safeParseJSON(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed;
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
    home: document.getElementById("screen-home"),
    editor: document.getElementById("screen-editor"),
  },

  list: document.getElementById("characterList"),
  empty: document.getElementById("emptyState"),

  buttons: {
    newChar: document.getElementById("newCharacterButton"),
    save: document.getElementById("saveCharacterButton"),
    home: document.getElementById("goHomeButton"),
    addAbilityRow: document.getElementById("addAbilityRowButton"),
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

function saveAll() {
  repo.saveAll(state.characters);
  repo.setActiveId(state.activeId);
}

function findAbilityById(abilityId) {
  return state.abilitiesCatalog.find((a) => a.id === abilityId) || null;
}

function getStatValueByCode(character, code) {
  switch (code) {
    case "VIG":
      return toInt(character.stats.vigore, 0);
    case "AGI":
      return toInt(character.stats.agilita, 0);
    case "ING":
      return toInt(character.stats.ingegno, 0);
    case "SPI":
      return toInt(character.stats.spirito, 0);
    default:
      return 0;
  }
}

function calculateAbilityRow(character, row) {
  const ability = findAbilityById(row.abilityId);

  if (!ability) {
    return {
      diff: "—",
      car: "—",
      pool: "0d6",
      cap: "—",
      overCap: false,
    };
  }

  const spentPoints = toInt(row.spentPoints, 0);
  const statValue = getStatValueByCode(character, ability.car);
  const poolTotal = ability.poolBase + spentPoints;

  return {
    diff: ability.diff,
    car: ability.car,
    pool: `${poolTotal}d6`,
    cap: ability.cap,
    overCap: spentPoints > ability.cap,
    statValue,
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

function buildAbilityOptions(selectedId = "") {
  const options = ['<option value="">Seleziona abilità</option>'];

  state.abilitiesCatalog.forEach((ability) => {
    const selected = ability.id === selectedId ? "selected" : "";
    options.push(
      `<option value="${escapeHtml(ability.id)}" ${selected}>${escapeHtml(ability.nome)}</option>`
    );
  });

  return options.join("");
}

function renderAbilities() {
  const character = getActiveChar();
  if (!character || !dom.abilitiesList) return;

  dom.abilitiesList.innerHTML = "";

  (character.abilities || []).forEach((row, index) => {
    const computed = calculateAbilityRow(character, row);

    const rowEl = document.createElement("div");
    rowEl.className = `ability-card${computed.overCap ? " is-danger" : ""}`;
    rowEl.dataset.rowIndex = index;

    rowEl.innerHTML = `
      <div class="field-group ability-card__name">
        <label>Abilità</label>
        <select class="ability-name" data-row-index="${index}">
          ${buildAbilityOptions(row.abilityId)}
        </select>
      </div>

      <div class="ability-card__pool-wrap">
        <span class="ability-card__pool-label">Pool</span>
        <span class="ability-pool ability-card__pool">${computed.pool}</span>
      </div>

      <div class="ability-card__meta">
        <div class="field-group ability-card__pp">
          <label>PP</label>
          <input
            class="ability-points"
            data-row-index="${index}"
            type="number"
            min="0"
            max="6"
            step="1"
            value="${toInt(row.spentPoints, 0)}"
          />
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
      </div>
    `;

    dom.abilitiesList.appendChild(rowEl);
  });
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
    show("home");
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
  character.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderEditor();
  renderList();
}

function handleAbilityPointsChange(event) {
  const character = getActiveChar();
  if (!character) return;

  const input = event.target.closest(".ability-points");
  if (!input) return;

  const rowIndex = toInt(input.dataset.rowIndex, 0);

  if (!character.abilities[rowIndex]) {
    character.abilities[rowIndex] = { abilityId: "", spentPoints: 0 };
  }

  character.abilities[rowIndex].spentPoints = toInt(input.value, 0);
  character.meta.updatedAt = new Date().toISOString();

  saveAll();
  renderEditor();
  renderList();
}

function addAbilityRow() {
  const character = getActiveChar();
  if (!character) return;

  character.abilities.push({
    abilityId: "",
    spentPoints: 0,
  });

  character.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderEditor();
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
  .filter((row) => row.id && row.nome);
}

function bindEvents() {
  dom.buttons.newChar.onclick = createChar;
  dom.buttons.save.onclick = updateChar;
  dom.buttons.home.onclick = () => show("home");
  dom.buttons.addAbilityRow.onclick = addAbilityRow;
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

    if (event.target.matches(".ability-points")) {
      handleAbilityPointsChange(event);
    }
  });

  dom.abilitiesList.addEventListener("input", (event) => {
    if (event.target.matches(".ability-points")) {
      handleAbilityPointsChange(event);
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

  renderList();

  if (state.activeId) {
    renderEditor();
    show("editor");
  } else {
    show("home");
  }
}

init().catch((error) => {
  console.error(error);
  alert("Errore reale: " + error.message);
});
