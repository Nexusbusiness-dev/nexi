// Nexis eigenes Wissen: Er liest selbst in der freien Wikipedia nach, speichert das Gelernte
// in seinem eigenen Speicher auf dem Handy und kann es danach auch ohne Internet wiedergeben.
// Kein Anbieter, kein Schlüssel, keine fremde KI.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nexi_wissen_v1";
const STOP = new Set(("was wer wie wo wann warum wieso weshalb ist sind war waren bedeutet bedeuten ein eine einen einem einer eines der die das den dem des " +
  "und oder mir mich dir du bitte erkläre erklär erklären sag sage kennst weißt weisst etwas alles über ueber von vom zum zur im in auf an es funktioniert liegt wurde lerne lern denn eigentlich genau").split(" "));

// Ist das eine Wissensfrage? (Plausch wie "wie geht's?" soll nicht im Lexikon landen.)
const ASK = /^(was|wer) (ist|sind|war|waren|bedeutet|bedeuten)\b|^(erkl\w*|wie funktioniert|wo liegt|wo ist|wann (war|wurde|ist)|kennst du|weißt du|weisst du|sag mir (was|etwas|alles)|lern\w* (was )?(über|ueber))/;

export function topicOf(text) {
  return text.toLowerCase().replace(/[?!.,;:"„“()]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).join(" ").trim();
}
export function isKnowledgeAsk(text) { return ASK.test(text.trim().toLowerCase()); }

async function load() {
  try { return JSON.parse(await AsyncStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
const save = (db) => AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => {});

function find(db, topic) {
  if (db[topic]) return db[topic];
  const k = Object.keys(db).find((k) => k.length >= 3 && (topic.includes(k) || k.includes(topic)));
  return k ? db[k] : null;
}

async function fetchWiki(topic) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const url = "https://de.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1&prop=extracts&exintro=1&explaintext=1&exsentences=3&format=json&origin=*&gsrsearch=" + encodeURIComponent(topic);
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const pages = d.query && d.query.pages ? Object.values(d.query.pages) : [];
    const p = pages[0];
    if (!p || !p.extract) return null;
    return { title: p.title, text: p.extract.trim() };
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

// Schlägt nach (erst eigener Speicher, dann Wikipedia). Gibt {title, text, fresh} oder null zurück.
export async function lookup(b, text) {
  if (!isKnowledgeAsk(text)) return null;
  const topic = topicOf(text);
  if (topic.length < 3) return null;
  const db = await load();
  const hit = find(db, topic);
  if (hit) return { title: hit.title, text: hit.text, fresh: false };
  const got = await fetchWiki(topic);
  if (!got) return null; // kein Internet / nichts gefunden
  const entry = { title: got.title, text: got.text, t: Date.now() };
  db[topic] = entry;
  db[got.title.toLowerCase()] = entry;
  await save(db);
  b.trait.curious = Math.min(1, b.trait.curious + 0.02);
  return { title: got.title, text: got.text, fresh: true };
}

// Notlösung ohne Sprachmodell: Gelerntes direkt wiedergeben.
export function wiedergabe(k) {
  return k.fresh ? "Hab grad nachgelesen (Wikipedia: " + k.title + "):\n" + k.text : k.text;
}
