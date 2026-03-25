const DEFAULT_PP_MAX = 12;

const state = {
  characters: [],
  activeId: null,
  abilitiesCatalog: [],
  talentsCatalog: [],
  ui: {
    abilitiesEditMode: false,
    talentsEditMode: false,
    currentArea: null, // "player" | "gm" | "editor" | null
    editMode: false,
  },
};

// ----------------------
// NAVIGAZIONE CENTRALIZZATA
// ----------------------

function openPlayerHome() {
  state.ui.currentArea = "player";
  show("player");
  renderList();
  updateFooter();
}

function openGMHome() {
  state.ui.currentArea = "gm";
  show("gm");
  updateFooter();
}

function openRoleScreen() {
  state.ui.currentArea = null;
  show("role");
  updateFooter();
}

function openEditor(character) {
  state.ui.currentArea = "editor";
  renderEditor();
  setTopbarCharacterContext(character);
  show("editor");
  updateFooter();
}

const dom = {
  screens: {
    role: document.getElementById("screen-role"),
    player: document.getElementById("screen-player"),
    gm: document.getElementById("screen-gm"),
    editor: document.getElementById("screen-editor"),
  },

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

// ----------------------
// FIX FOOTER
// ----------------------

function updateFooter() {
  if (!dom.footer.root) return;

  const shouldShowFooter =
    state.ui.currentArea === "player" || state.ui.currentArea === "editor";

  dom.footer.root.classList.toggle("hidden", !shouldShowFooter);

  if (!shouldShowFooter) return;

  if (dom.footer.edit) {
    dom.footer.edit.textContent = state.ui.editMode ? "Salva" : "Modifica";
  }

  if (dom.footer.next) {
    dom.footer.next.classList.add("disabled");
  }
}

// ----------------------
// FIX CLICK PERSONAGGIO
// ----------------------

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
          <img src="assets/icons/user.svg" />
        </div>
        <span class="character-card__name">${c.name}</span>
      `;

      el.addEventListener("click", () => {
        state.activeId = c.id;
        saveAll();
        openEditor(c);
      });

      dom.list.appendChild(el);
    });
  }

  updateFooter();
}

// ----------------------
// FIX BACK BUTTON
// ----------------------

function bindEvents() {
  if (dom.footer.back) {
    dom.footer.back.onclick = () => {
      if (state.ui.editMode) {
        const ok = window.confirm("Uscire senza salvare?");
        if (!ok) return;
        exitEditMode();
      }

      openPlayerHome();
    };
  }
}
