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