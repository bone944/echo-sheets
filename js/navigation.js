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
  if (dom.labels.currentRole) {
    dom.labels.currentRole.textContent = "Giocatore";
  }
  show("player");
  renderList();
}

function openGMHome() {
  state.ui.currentArea = "gm";
  if (dom.labels.currentRole) {
    dom.labels.currentRole.textContent = "GM";
  }
  show("gm");
}