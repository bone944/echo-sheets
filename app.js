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

function saveAll() {
  repo.saveAll(state.characters);
  repo.setActiveId(state.activeId);
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
document.getElementById("selectPlayerRole").onclick = openPlayerHome;
document.getElementById("selectGMRole").onclick = openGMHome;
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
  bindEditorTabs();

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
