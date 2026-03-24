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