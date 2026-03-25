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
    editMode: false,   // edit mode della Home Giocatore
  },
};

const dom = {
  screens: {
    role: document.getElementById("screen-role"),
    player: document.getElementById("screen-player"),
    gm: document.getElementById("screen-gm"),
    editor: document.getElementById("screen-editor"),
  },

  roleCards: document.querySelectorAll(".role-card"),

  list: document.getElementById("characterList"),
  empty: document.getElementById("emptyState"),

  footer: {
    root: document.getElementById("playerFooter"),
    back: document.getElementById("footerBack"),
    edit: document.getElementById("footerEdit"),
    next: document.getElementById("footerNext"),
  },

  floating: {
    addCharacter: document.getElementById("addCharacterFloating"),
  },

  topbar: {
    name: document.getElementById("topbarName"),
    avatar: document.getElementById("topbarAvatar"),
  },

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

function getActiveChar() {
  return state.characters.find((c) => c.id === state.activeId) || null;
}

function saveAll() {
  repo.saveAll(state.characters);
  repo.setActiveId(state.activeId);
}

function setTopbarUserContext() {
  if (dom.topbar.name) {
    dom.topbar.name.textContent = "username";
  }

  if (dom.topbar.avatar) {
    dom.topbar.avatar.src = "assets/icons/user.svg";
    dom.topbar.avatar.alt = "Utente";
  }
}

function setTopbarCharacterContext(character) {
  if (!character) return;

  if (dom.topbar.name) {
    dom.topbar.name.textContent = character.name || "Personaggio";
  }

  if (dom.topbar.avatar) {
    dom.topbar.avatar.src = "assets/icons/user.svg";
    dom.topbar.avatar.alt = character.name || "Personaggio";
  }
}

function enterEditMode() {
  state.ui.editMode = true;
  renderList();
  updateFooter();
}

function exitEditMode() {
  state.ui.editMode = false;
  renderList();
  updateFooter();
}

function persistCharacterListEdits() {
  const inputs = document.querySelectorAll(".character-card__name[data-id]");

  inputs.forEach((input) => {
    const id = input.dataset.id;
    const character = state.characters.find((c) => c.id === id);
    if (!character) return;

    const nextName = input.value.trim();
    character.name = nextName || "Nuovo personaggio";
    character.meta.updatedAt = new Date().toISOString();
  });

  saveAll();
}

function updateFooter() {
  if (!dom.footer.root) return;

  const shouldShowFooter = state.ui.currentArea === "player";
  dom.footer.root.classList.toggle("hidden", !shouldShowFooter);

  if (!shouldShowFooter) return;

  if (dom.footer.edit) {
    dom.footer.edit.textContent = state.ui.editMode ? "Salva" : "Modifica";
  }

  if (dom.footer.next) {
    dom.footer.next.classList.add("disabled");
  }
}

function renderList() {
  if (!dom.list) return;

  dom.list.innerHTML = "";

  if (!Array.isArray(state.characters) || state.characters.length === 0) {
    if (dom.empty) dom.empty.classList.remove("hidden");
  } else {
    if (dom.empty) dom.empty.classList.add("hidden");

    state.characters.forEach((c) => {
      const el = document.createElement("div");
      el.className = `character-card ${state.ui.editMode ? "edit" : ""}`;
      el.dataset.id = c.id;

      el.innerHTML = `
        <div class="character-card__avatar">
          <img src="assets/icons/user.svg" alt="Avatar personaggio" />
        </div>

        ${
          state.ui.editMode
            ? `<input class="character-card__name" value="${escapeHtml(c.name)}" data-id="${c.id}" />`
            : `<span class="character-card__name">${escapeHtml(c.name)}</span>`
        }

        ${
          state.ui.editMode
            ? `
              <button
                class="character-delete"
                data-id="${c.id}"
                type="button"
                aria-label="Elimina personaggio"
                title="Elimina personaggio"
              >−</button>
            `
            : ""
        }
      `;

      if (!state.ui.editMode) {
        el.addEventListener("click", () => {
          state.activeId = c.id;
          saveAll();
          renderEditor();
          setTopbarCharacterContext(c);
          show("editor");
          updateFooter();
        });
      }

      dom.list.appendChild(el);
    });
  }

  if (dom.floating.addCharacter) {
    dom.floating.addCharacter.classList.toggle("hidden", !state.ui.editMode);
  }

  updateFooter();
}

function renderEditor() {
  const c = getActiveChar();
  if (!c) return;

  const d = calculateDerived(c);

  if (dom.editor.name) dom.editor.name.value = c.name;
  if (dom.editor.type) dom.editor.type.value = c.profileType;
  if (dom.editor.ppMax) dom.editor.ppMax.value = c.ppMax;

  if (dom.editor.vigore) dom.editor.vigore.value = c.stats.vigore;
  if (dom.editor.agilita) dom.editor.agilita.value = c.stats.agilita;
  if (dom.editor.ingegno) dom.editor.ingegno.value = c.stats.ingegno;
  if (dom.editor.spirito) dom.editor.spirito.value = c.stats.spirito;

  if (dom.output.tempra) dom.output.tempra.textContent = d.tempra;
  if (dom.output.evasione) dom.output.evasione.textContent = d.evasione;
  if (dom.output.mente) dom.output.mente.textContent = d.mente;
  if (dom.output.risolutezza) dom.output.risolutezza.textContent = d.risolutezza;
  if (dom.output.ppSpent) dom.output.ppSpent.textContent = d.ppSpent;
  if (dom.output.ppMax) dom.output.ppMax.textContent = c.ppMax;

  if (dom.output.tempraLarge) dom.output.tempraLarge.textContent = d.tempra;
  if (dom.output.evasioneLarge) dom.output.evasioneLarge.textContent = d.evasione;
  if (dom.output.menteLarge) dom.output.menteLarge.textContent = d.mente;
  if (dom.output.risolutezzaLarge) dom.output.risolutezzaLarge.textContent = d.risolutezza;

  if (dom.output.ppSpent) dom.output.ppSpent.classList.toggle("text-danger", d.ppSpent > c.ppMax);
  if (dom.output.ppMax) dom.output.ppMax.classList.toggle("text-danger", d.ppSpent > c.ppMax);

  if (dom.labels.saveStatus) {
    dom.labels.saveStatus.textContent =
      d.ppSpent > c.ppMax
        ? "Attenzione: i PP spesi superano i PP Max."
        : "Modifiche salvate localmente.";
  }

  renderAbilities();
  renderTalents();
  setTopbarCharacterContext(c);
  updateFooter();
}

function updateChar() {
  const c = getActiveChar();
  if (!c) return;

  c.name = dom.editor.name?.value.trim() || "Nuovo personaggio";
  c.profileType = dom.editor.type?.value || "player";
  c.ppMax = toInt(dom.editor.ppMax?.value, DEFAULT_PP_MAX);

  c.stats.vigore = toInt(dom.editor.vigore?.value, 0);
  c.stats.agilita = toInt(dom.editor.agilita?.value, 0);
  c.stats.ingegno = toInt(dom.editor.ingegno?.value, 0);
  c.stats.spirito = toInt(dom.editor.spirito?.value, 0);

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
  setTopbarCharacterContext(c);
  show("editor");
  updateFooter();
}

function createCharacterInList() {
  const c = createEmptyCharacter();
  state.characters.push(c);
  c.meta.updatedAt = new Date().toISOString();
  saveAll();
  renderList();

  // Focus sul nuovo input nome, se presente
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll(".character-card__name[data-id]");
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      lastInput.focus();
      lastInput.select();
    }
  });
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
  setTopbarCharacterContext(clone);
  show("editor");
  updateFooter();
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
    setTopbarUserContext();
  }

  updateFooter();
}

function deleteCharacterFromList(characterId) {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return;

  const ok = window.confirm(`Vuoi davvero eliminare "${character.name}"?`);
  if (!ok) return;

  state.characters = state.characters.filter((c) => c.id !== characterId);

  if (state.activeId === characterId) {
    state.activeId = state.characters.length ? state.characters[0].id : null;
  }

  saveAll();
  renderList();
}

function bindEvents() {
  // Schermata ruolo
  const playerRoleButton = document.getElementById("selectPlayerRole");
  const gmRoleButton = document.getElementById("selectGMRole");

  if (playerRoleButton) {
    playerRoleButton.addEventListener("click", () => {
      openPlayerHome();
      setTopbarUserContext();
      updateFooter();
    });
  }

  if (gmRoleButton) {
    gmRoleButton.addEventListener("click", () => {
      openGMHome();
      setTopbarUserContext();
      updateFooter();
    });
  }

  // Header / nav principale
  if (dom.buttons.home) {
    dom.buttons.home.onclick = () => {
      openRoleScreen();
      setTopbarUserContext();
      updateFooter();
    };
  }

  // Home Giocatore - footer
  if (dom.footer.edit) {
    dom.footer.edit.onclick = () => {
      if (state.ui.editMode) {
        persistCharacterListEdits();
        exitEditMode();
      } else {
        enterEditMode();
      }
    };
  }

  if (dom.footer.back) {
    dom.footer.back.onclick = () => {
      if (state.ui.editMode) {
        const ok = window.confirm("Uscire dalla modifica senza salvare?");
        if (!ok) return;
        exitEditMode();
      }

      openRoleScreen();
      setTopbarUserContext();
      updateFooter();
    };
  }

  // FAB aggiunta personaggio
  if (dom.floating.addCharacter) {
    dom.floating.addCharacter.onclick = createCharacterInList;
  }

  // Editor personaggio
  if (dom.buttons.save) dom.buttons.save.onclick = updateChar;
  if (dom.buttons.addAbilityRow) dom.buttons.addAbilityRow.onclick = addAbilityRow;
  if (dom.buttons.toggleAbilitiesEdit) dom.buttons.toggleAbilitiesEdit.onclick = toggleAbilitiesEditMode;
  if (dom.buttons.addTalentRow) dom.buttons.addTalentRow.onclick = addTalentRow;
  if (dom.buttons.toggleTalentsEdit) dom.buttons.toggleTalentsEdit.onclick = toggleTalentsEditMode;
  if (dom.buttons.duplicateCharacter) dom.buttons.duplicateCharacter.onclick = duplicateCharacter;
  if (dom.buttons.deleteCharacter) dom.buttons.deleteCharacter.onclick = deleteCharacter;

  // Lista personaggi: delete in edit mode
  if (dom.list) {
    dom.list.addEventListener("click", (event) => {
      const deleteBtn = event.target.closest(".character-delete");
      if (deleteBtn) {
        const characterId = deleteBtn.dataset.id;
        deleteCharacterFromList(characterId);
      }
    });

    // Rename inline live nello state? No: salviamo solo con "Salva"
    dom.list.addEventListener("input", (event) => {
      const input = event.target.closest(".character-card__name[data-id]");
      if (!input) return;

      // Nessun salvataggio immediato: lasciamo il commit al bottone Salva
    });
  }

  // Form editor base
  [
    dom.editor.name,
    dom.editor.type,
    dom.editor.ppMax,
    dom.editor.vigore,
    dom.editor.agilita,
    dom.editor.ingegno,
    dom.editor.spirito,
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("input", updateChar);
      el.addEventListener("change", updateChar);
    });

  // Abilità
  if (dom.abilitiesList) {
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
  }

  // Talenti
  if (dom.talentsList) {
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

  if (typeof bindEditorTabs === "function") {
    bindEditorTabs();
  }

  if (dom.labels.currentRole) dom.labels.currentRole.textContent = "Giocatore";
  if (dom.labels.storageMode) dom.labels.storageMode.textContent = "Locale";

  await loadAbilitiesCatalog();
  await loadTalentsCatalog();

  setTopbarUserContext();
  renderList();
  show("role");
  updateFooter();
}

init().catch((error) => {
  console.error(error);
  alert("Errore reale: " + error.message);
});