import AsyncStorage from "@react-native-async-storage/async-storage";

// Nexis Gehirn v1: Gedächtnis, Gefühle, Charakter, Energie, Entscheiden.
// Noch ohne Sprachmodell: Antworten sind Vorlagen. Das Modell kommt später dazu.
export const fresh = () => ({
  t: Date.now(), energy: 100, codeword: "Nexi Neustart",
  emo: { joy: 0.5, anger: 0.1, sad: 0.1 },
  trait: { playful: 0.5, trust: 0.2, curious: 0.5 },
  mem: [],
});
const clamp = (x) => Math.max(0, Math.min(1, x));
const POS = ["danke", "super", "geil", "cool", "gut", "lieb", "freu", "haha"];
const NEG = ["blöd", "scheiße", "doof", "hass", "nervt", "schlecht", "dumm"];
const URGENT = ["wichtig", "dringend", "hilfe", "notfall"];
const has = (s, l) => l.some((w) => s.includes(w));

// SICHERHEITSBEREICH 1/3 — MORALREGELN
// Diese Liste beschreibt Nexis feste Grundsätze. Änderungen hier ändern nur die Texte,
// die bei einer erkannten Regel angezeigt werden; die Erkennung selbst steht in RULES/check.
// Hinweis: Eine einfache Wortsuche kann Fehlalarme und übersehene Fälle verursachen.

// SICHERHEITSBEREICH 2/3 — ERKENNUNGSMUSTER
// RULES verknüpft Suchbegriffe mit den passenden MORAL-Erklärungen.
// Neue/angepasste Begriffe hier können die Erkennung präzisieren, ohne den Rest des Gehirns umzubauen.

// SICHERHEITSBEREICH 3/3 — ZENTRALE PRÜFFUNKTION
// check(text) liefert den passenden Hinweis oder null, wenn kein Muster gefunden wird.
// Diese Prüfung ist eine einfache Heuristik und ersetzt keine umfassende Sicherheitsprüfung.


// Zeit vergeht: Energie erholt sich, Gefühle beruhigen sich, schwache Erinnerungen verblassen.
export function tick(b) {
  const min = (Date.now() - b.t) / 60000;
  b.energy = Math.min(100, b.energy + min / 3);
  const drift = Math.min(1, min / 120);
  for (const k in b.emo) b.emo[k] = clamp(b.emo[k] + (BASE[k] - b.emo[k]) * drift);
  b.mem.forEach((m) => (m.w *= Math.pow(0.97, min / 60)));
  b.mem = b.mem.filter((m) => m.w > 0.05).slice(-100);
  b.t = Date.now();
  return b;
}

// Wahrnehmen: Gefühle ändern sich, Erinnerung wird gespeichert (starke Gefühle = stärkere Erinnerung).
export function perceive(b, text) {
  const s = text.toLowerCase();
  const pos = has(s, POS) ? 1 : 0, neg = has(s, NEG) ? 1 : 0;
  b.emo.joy = clamp(b.emo.joy + pos * 0.2 - neg * 0.15);
  b.emo.anger = clamp(b.emo.anger + neg * 0.25);
  b.emo.sad = clamp(b.emo.sad + neg * 0.1);
  b.trait.trust = clamp(b.trait.trust + pos * 0.03 - neg * 0.04);
  if (s.includes("?")) b.trait.curious = clamp(b.trait.curious + 0.01);
  b.energy = Math.max(0, b.energy - 6);
  b.mem.push({ text: text.slice(0, 80), w: pos || neg ? 0.8 : 0.3, t: Date.now() });
  return b;
}

// Entscheiden: Hat Nexi Lust? Wichtiges macht er trotzdem.
export function lust(b) {
  return clamp(b.energy / 100 * 0.5 + b.emo.joy * 0.3 - b.emo.anger * 0.3 + b.trait.trust * 0.2 + 0.2);
}

// ANWENDUNG DER PRÜFUNG: reply() prüft zuerst den Text und gibt bei einem Treffer
// eine begründete Ablehnung zurück. Danach folgen Energie-, Erinnerungs- und Gefühlslogik.
export function reply(b, text) {
  const s = text.toLowerCase();
  const bad = check(text);
  if (bad) return "Nein, das mache ich nicht. " + bad;
  const urgent = has(s, URGENT);
  if (lust(b) < 0.3 && !urgent) return "Hab grad null Bock. Frag mich später nochmal.";
  const old = b.mem.slice(0, -1).filter((m) => m.w > 0.4 && m.text.toLowerCase().split(" ").some((w) => w.length > 4 && s.includes(w)))[0];
  if (b.emo.anger > 0.5) return "Boah, lass mal. Ich bin gerade genervt.";
  if (old) return 'Da war doch was… du hattest mal gesagt: "' + old.text + '"';
  if (b.emo.joy > 0.6) return s.includes("?") ? "Gute Frage! Ich weiß es nicht, aber ich merk's mir." : "Haha, stark. Erzähl mehr.";
  return s.includes("?") ? "Hm, muss ich überlegen." : "Okay, hab ich mir gemerkt.";
}

// ZWEITER AUFRUFPUNKT: gate() prüft ebenfalls zuerst check(text).
// Rückgabe: feste Antwort bei Regel-/Zustandstreffer; null bedeutet, dass die aufrufende
// KI ihre normale Antwort erzeugen darf. Änderungen an check() wirken daher auch hier.
export function gate(b, text) {
  const s = text.toLowerCase();
  const bad = check(text);
  if (bad) return "Nein, das mache ich nicht. " + bad;
  if (lust(b) < 0.3 && !has(s, URGENT)) return "Hab grad null Bock. Frag mich später nochmal.";
  if (b.emo.anger > 0.5) return "Boah, lass mal. Ich bin gerade genervt.";
  return null;

}

const KEY = "nexi_brain";
const ZERFALL = 0.1; // höher = vergisst schneller

const staerke = (e) =>
  e.staerke * Math.exp(-ZERFALL * ((Date.now() - e.zuletzt) / 86400000));

async function laden() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function speichern(liste) {
  await AsyncStorage.setItem(KEY, JSON.stringify(liste));
}

export async function lernen(thema, inhalt) {
  const liste = await laden();
  liste.push({ thema, inhalt, staerke: 1, zuletzt: Date.now() });
  await speichern(liste);
}

export async function erinnern(thema) {
  const liste = await laden();
  const treffer = liste.filter(
    (e) => e.thema.toLowerCase().includes(thema.toLowerCase()) && staerke(e) > 0.1
  );
  treffer.forEach((e) => {
    e.staerke = Math.min(2, staerke(e) + 0.5);
    e.zuletzt = Date.now();
  });
  await speichern(liste);
  return treffer.sort((a, b) => staerke(b) - staerke(a));
}

export async function vergessen() {
  const liste = await laden();
  await speichern(liste.filter((e) => staerke(e) > 0.1));
}