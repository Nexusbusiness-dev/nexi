import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nexi_tasks_v1";
const IDEAS_KEY = "nexi_improvement_ideas_v1";

async function read(key, fallback) {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
async function write(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function stepsFor(goal) {
  const s = goal.toLowerCase();
  if (/code|programm|app|fehler|bug|github|build|skript/.test(s)) {
    return ["Ziel und erwartetes Ergebnis festlegen", "Betroffene Dateien und Fehlermeldungen prüfen", "Kleine Änderung planen", "Änderung umsetzen", "Tests/Build ausführen und Ergebnis dokumentieren"];
  }
  if (/sicher|schutz|audit|test|angriff|hacker/.test(s)) {
    return ["Nur ein eigenes oder ausdrücklich freigegebenes System festlegen", "Umgebung und Berechtigung dokumentieren", "Konfiguration und bekannte Schwachstellen prüfen", "Befunde ohne Ausnutzung dokumentieren", "Abhilfe umsetzen und erneut testen"];
  }
  return ["Ziel konkret beschreiben", "Benötigte Informationen sammeln", "Kleine Schritte festlegen", "Schritte nacheinander erledigen", "Ergebnis prüfen und bei Bedarf verbessern"];
}

export async function createTask(goal, kind = "task") {
  const clean = String(goal || "").trim();
  if (!clean) return null;
  const tasks = await read(KEY, []);
  const task = { id: String(Date.now()), goal: clean.slice(0, 500), kind, steps: stepsFor(clean), doneSteps: [], status: "open", createdAt: Date.now() };
  tasks.push(task);
  await write(KEY, tasks.slice(-50));
  return task;
}

export async function listTasks() {
  return (await read(KEY, [])).sort((a, b) => b.createdAt - a.createdAt);
}

export async function completeStep(taskNumber) {
  const tasks = await read(KEY, []);
  const open = tasks.filter((t) => t.status !== "done");
  const index = Number(taskNumber) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= open.length) return null;
  const task = open[index];
  const next = task.steps.findIndex((_, i) => !task.doneSteps.includes(i));
  if (next < 0) task.status = "done";
  else {
    task.doneSteps.push(next);
    if (task.doneSteps.length >= task.steps.length) task.status = "done";
  }
  await write(KEY, tasks);
  return task;
}

export async function saveImprovementIdea(idea) {
  const clean = String(idea || "").trim();
  if (!clean) return false;
  const ideas = await read(IDEAS_KEY, []);
  ideas.push({ idea: clean.slice(0, 500), createdAt: Date.now(), status: "Vorschlag – manuelle Prüfung nötig" });
  await write(IDEAS_KEY, ideas.slice(-50));
  return true;
}

export async function listImprovementIdeas() {
  return read(IDEAS_KEY, []);
}

export function formatTasks(tasks) {
  if (!tasks.length) return "Noch keine Aufgaben gespeichert. Beispiel: Plane: Meine App testen";
  return tasks.map((task, i) => {
    const progress = task.doneSteps.length + "/" + task.steps.length;
    const steps = task.steps.map((step, n) => (task.doneSteps.includes(n) ? "✓ " : "• ") + step).join("\n");
    return (i + 1) + ". " + task.goal + " [" + (task.status === "done" ? "erledigt" : progress) + "]\n" + steps;
  }).join("\n\n");
}

export function formatIdeas(ideas) {
  if (!ideas.length) return "Noch keine Verbesserungsvorschläge gespeichert. Schreib: Verbessere dich: ...";
  return ideas.map((item, i) => (i + 1) + ". " + item.idea + " — " + item.status).join("\n");
}

export function securityChecklist() {
  return "Sicherheitscheck für ein eigenes/freigegebenes Projekt:\n1. Abhängigkeiten und bekannte CVEs prüfen\n2. Geheimnisse/API-Schlüssel aus dem Code entfernen\n3. Authentifizierung und Berechtigungen testen\n4. Eingaben validieren und Datenzugriffe prüfen\n5. Logs auf sensible Daten prüfen\n6. Backups und Wiederherstellung testen\n7. Befunde dokumentieren und nach dem Fix erneut testen.\nIch führe damit keinen Angriff aus; es ist eine defensive Checkliste.";
}
