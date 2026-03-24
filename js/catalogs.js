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