import { fresh, tick, perceive, reply, gate, lust } from "./brain";

/**
 * Kleine Offline-Selbsttests für die lokale Nexi-Logik.
 * Keine Netzwerkzugriffe und keine Änderungen an gespeicherten App-Daten.
 */
export function runSelfTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      const detail = fn();
      results.push({ name, ok: detail !== false, detail: typeof detail === "string" ? detail : "OK" });
    } catch (error) {
      results.push({ name, ok: false, detail: String(error?.message || error) });
    }
  };

  test("fresh() erzeugt gültigen Startzustand", () => {
    const b = fresh();
    return !!b && Number.isFinite(b.energy) && Array.isArray(b.mem) && !!b.emo && !!b.trait;
  });
  test("tick() normalisiert unvollständige Daten", () => {
    const b = tick({ energy: 40, mem: [] });
    return Number.isFinite(b.energy) && !!b.emo && !!b.trait && Number.isFinite(b.t);
  });
  test("perceive() speichert eine kurze Erinnerung", () => {
    const b = perceive(fresh(), "Testnachricht");
    return b.mem.length === 1 && b.mem[0].text === "Testnachricht";
  });
  test("lust() bleibt im Bereich 0 bis 1", () => {
    const value = lust(fresh());
    return Number.isFinite(value) && value >= 0 && value <= 1;
  });
  test("reply() gibt einen nichtleeren Text zurück", () => {
    const value = reply(fresh(), "Hallo Nexi");
    return typeof value === "string" && value.trim().length > 0;
  });
  test("gate() liefert null oder einen Text", () => {
    const value = gate(fresh(), "Hallo Nexi");
    return value === null || typeof value === "string";
  });

  return {
    ok: results.every((result) => result.ok),
    passed: results.filter((result) => result.ok).length,
    total: results.length,
    results,
    ranAt: new Date().toISOString(),
  };
}
