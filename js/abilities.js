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