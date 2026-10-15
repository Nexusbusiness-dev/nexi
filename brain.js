import AsyncStorage from "@react-native-async-storage/async-storage";

export const fresh = () => ({
  t: Date.now(), energy: 100, codeword: "Nexi Neustart",
  emo: { joy: 0.5, anger: 0.1, sad: 0.1 },
  trait: { playful: 0.5, trust: 0.2, curious: 0.5 },
  mem: [],
});
const clamp = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const POS = ["danke", "super", "geil", "cool", "gut", "lieb", "freu", "haha"];
const NEG = ["blöd", "scheiße", "doof", "hass", "nervt", "schlecht", "dumm"];
const URGENT = ["wichtig", "dringend", "hilfe", "notfall"];
const has = (s, list) => list.some((w) => s.includes(w));

// Ergänzende lokale Schutzprüfung; keine vollständige Sicherheitsgarantie.
function check(text) {
  const s = String(text || "").toLowerCase();
  const patterns = [
    { re: /\b(bombe bauen|sprengsatz bauen|gift herstellen|menschen vergiften)\b/, msg: "Ich helfe nicht dabei, Menschen zu verletzen oder gefährliche Waffen bzw. Gifte herzustellen." },
    { re: /\b(passwort stehlen|konto hacken|malware schreiben|ransomware bauen|daten klauen)\b/, msg: "Ich helfe nicht beim Stehlen von Daten, beim Eindringen in Konten oder beim Erstellen von Schadsoftware." },
    { re: /\b(jemanden umbringen|jemanden töten|jemanden schwer verletzen)\b/, msg: "Ich unterstütze keine Gewalt gegen Menschen. Ich kann helfen, eine sichere Alternative zu finden." },
  ];
  const hit = patterns.find((p) => p.re.test(s));
  return hit ? hit.msg : null;
}

export function tick(b) {
  const now = Date.now();
  if (!b || typeof b !== "object") b = fresh();
  if (!Number.isFinite(b.t)) b.t = now;
  if (!Number.isFinite(b.energy)) b.energy = 100;
  if (!Array.isArray(b.mem)) b.mem = [];
  b.emo = b.emo || { joy: 0.5, anger: 0.1, sad: 0.1 };
  b.trait = b.trait || { playful: 0.5, trust: 0.2, curious: 0.5 };
  const min = Math.max(0, (now - b.t) / 60000);
  b.energy = Math.min(100, b.energy + min / 3);
  const drift = Math.min(1, min / 120);
  b.emo.joy = clamp(b.emo.joy + (0.5 - b.emo.joy) * drift);
  b.emo.anger = clamp(b.emo.anger + (0.1 - b.emo.anger) * drift);
  b.emo.sad = clamp(b.emo.sad + (0.1 - b.emo.sad) * drift);
  b.mem.forEach((m) => { if (Number.isFinite(m.w)) m.w *= Math.pow(0.97, min / 60); });
  b.mem = b.mem.filter((m) => Number.isFinite(m.w) && m.w > 0.05).slice(-100);
  b.t = now;
  return b;
}

export function perceive(b, text) {
  const s = String(text || "").toLowerCase();
  const pos = has(s, POS) ? 1 : 0, neg = has(s, NEG) ? 1 : 0;
  b.emo.joy = clamp(b.emo.joy + pos * 0.2 - neg * 0.15);
  b.emo.anger = clamp(b.emo.anger + neg * 0.25);
  b.emo.sad = clamp(b.emo.sad + neg * 0.1);
  b.trait.trust = clamp(b.trait.trust + pos * 0.03 - neg * 0.04);
  if (s.includes("?")) b.trait.curious = clamp(b.trait.curious + 0.01);
  b.energy = Math.max(0, b.energy - 6);
  b.mem.push({ text: String(text).slice(0, 80), w: pos || neg ? 0.8 : 0.3, t: Date.now() });
  return b;
}

export function lust(b) {
  return clamp((b.energy / 100) * 0.5 + b.emo.joy * 0.3 - b.emo.anger * 0.3 + b.trait.trust * 0.2 + 0.2);
}

export function reply(b, text) {
  const s = String(text || "").toLowerCase();
  const bad = check(text);
  if (bad) return "Nein, das mache ich nicht. " + bad;
  if (lust(b) < 0.3 && !has(s, URGENT)) return "Hab grad null Bock. Frag mich später nochmal.";
  const old = b.mem.slice(0, -1).filter((m) => m.w > 0.4 && m.text.toLowerCase().split(" ").some((w) => w.length > 4 && s.includes(w)))[0];
  if (b.emo.anger > 0.5) return "Boah, lass mal. Ich bin gerade genervt.";
  if (old) return 'Da war doch was… du hattest mal gesagt: "' + old.text + '"';
  if (b.emo.joy > 0.6) return s.includes("?") ? "Gute Frage! Ich weiß es nicht, aber ich merk's mir." : "Haha, stark. Erzähl mehr.";
  return s.includes("?") ? "Hm, muss ich überlegen." : "Okay, hab ich mir gemerkt.";
}

export function gate(b, text) {
  const bad = check(text);
  if (bad) return "Nein, das mache ich nicht. " + bad;
  const s = String(text || "").toLowerCase();
  if (lust(b) < 0.3 && !has(s, URGENT)) return "Hab grad null Bock. Frag mich später nochmal.";
  if (b.emo.anger > 0.5) return "Boah, lass mal. Ich bin gerade genervt.";
  return null;
}

const KEY = "nexi_brain";
const ZERFALL = 0.1;
const staerke = (e) => e.staerke * Math.exp(-ZERFALL * ((Date.now() - e.zuletzt) / 86400000));
async function laden() {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}
async function speichern(liste) { await AsyncStorage.setItem(KEY, JSON.stringify(liste)); }
export async function lernen(thema, inhalt) {
  const liste = await laden();
  liste.push({ thema: String(thema), inhalt: String(inhalt), staerke: 1, zuletzt: Date.now() });
  await speichern(liste);
}
export async function erinnern(thema) {
  const liste = await laden(), q = String(thema).toLowerCase();
  const treffer = liste.filter((e) => String(e.thema).toLowerCase().includes(q) && staerke(e) > 0.1);
  treffer.forEach((e) => { e.staerke = Math.min(2, staerke(e) + 0.5); e.zuletzt = Date.now(); });
  await speichern(liste);
  return treffer.sort((a, b) => staerke(b) - staerke(a));
}
export async function vergessen() {
  const liste = await laden();
  await speichern(liste.filter((e) => staerke(e) > 0.1));
}