function show(screen) {
  Object.values(dom.screens).forEach((s) => {
    if (s) s.classList.remove("screen--active");
  });

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
function switchEditorTab(tabName) {
  document.querySelectorAll(".editor-tab").forEach((btn) => {
    btn.classList.toggle("editor-tab--active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".editor-tab-panel").forEach((panel) => {
    const isActive = panel.id === `tab-${tabName}`;
    panel.classList.toggle("hidden", !isActive);
  });
}

function bindEditorTabs() {
  document.querySelectorAll(".editor-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchEditorTab(btn.dataset.tab);
    });
  });
}

function openPlayerHome() {
  state.ui.currentArea = "player";
  dom.labels.currentRole.textContent = "Giocatore";
  show("player");
  renderList();
}