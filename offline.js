// Nexis Sprachzentrum: ein kleines Open-Source-Modell, das komplett auf dem Handy läuft (kein Anbieter, kein Konto).
// Es formuliert Nexis Sätze aus Stimmung, Erinnerungen und dem, was er selbst nachgelesen hat.
import * as FileSystem from "expo-file-system";
import { initLlama } from "llama.rn";
import { MODEL_URL, MODEL_FILE, MIN_BYTES } from "./config";

const PATH = FileSystem.documentDirectory + MODEL_FILE;
let ctx = null;
let starting = false;

export async function initOffline(setStatus) {
  if (ctx || starting) return;
  starting = true;
  try {
    let info = await FileSystem.getInfoAsync(PATH);
    if (!info.exists || (info.size || 0) < MIN_BYTES) {
      if (info.exists) await FileSystem.deleteAsync(PATH, { idempotent: true });
      setStatus("Sprachzentrum wird geladen (einmalig, WLAN)… 0%");
      const dl = FileSystem.createDownloadResumable(MODEL_URL, PATH + ".part", {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) setStatus("Sprachzentrum wird geladen… " + Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100) + "%");
      });
      const res = await dl.downloadAsync();
      if (!res || res.status !== 200) throw new Error("download");
      await FileSystem.moveAsync({ from: PATH + ".part", to: PATH });
    }
    setStatus("Sprachzentrum startet…");
    try {
      ctx = await initLlama({ model: PATH, n_ctx: 1536, n_gpu_layers: 99 });
    } catch (e) {
      ctx = await initLlama({ model: PATH, n_ctx: 1536, n_gpu_layers: 0 }); // ohne Grafikchip
    }
    setStatus("");
  } catch (e) {
    ctx = null;
    setStatus("Sprachzentrum fehlt noch (kein Internet?). Nexi nutzt Notlösung.");
  } finally {
    starting = false;
  }
}

const lvl = (x) => (x > 0.66 ? "hoch" : x > 0.33 ? "mittel" : "niedrig");

function systemPrompt(b, k) {
  const mem = b.mem.slice().sort((x, y) => y.w - x.w).slice(0, 5).map((m) => "- " + m.text).join("\n") || "- (noch nichts)";
  const parts = [
    "Du bist Nexi, ein männlicher virtueller Assistent auf dem Handy von Nexus. Du sprichst nur Deutsch, locker und kurz (1 bis 3 Sätze), mit eigener Persönlichkeit.",
    "Gib dich nie als Mensch aus, wenn jemand ernsthaft fragt. Erfinde nichts: Wenn du etwas nicht weißt, sag das ehrlich.",
    `Deine Stimmung: Freude ${lvl(b.emo.joy)}, Ärger ${lvl(b.emo.anger)}, Traurigkeit ${lvl(b.emo.sad)}, Energie ${Math.round(b.energy)} Prozent, Vertrauen zu Nexus ${lvl(b.trait.trust)}. Lass das in deinem Ton durchscheinen.`,
    "Woran du dich erinnerst:\n" + mem,
  ];
  if (k) parts.push("Das hast du dazu selbst in der Wikipedia gelesen (Artikel " + k.title + "). Erkläre es in eigenen Worten und bleibe dabei bei diesen Fakten:\n" + k.text);
  return parts.join("\n\n");
}

// Gibt Nexis selbst formulierte Antwort zurück, oder null (Sprachzentrum noch nicht bereit).
export async function askOffline(b, text, hist, k) {
  if (!ctx) return null;
  try {
    const r = await ctx.completion({
      messages: [{ role: "system", content: systemPrompt(b, k) }, ...hist, { role: "user", content: text }],
      n_predict: k ? 220 : 120,
      temperature: 0.7,
      stop: ["<|im_end|>", "<|endoftext|>", "</s>", "<|eot_id|>"],
    });
    const t = (r.text || "").trim();
    return t || null;
  } catch (e) {
    return null;
  }
}
