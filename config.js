// Das Sprachmodell lädt Nexi beim ersten Start selbst herunter (einmalig, WLAN empfohlen).
// Größer = klüger, braucht aber mehr Speicher. Für ältere/kleinere iPhones nimm das 0.5B-Modell.
export const MODEL_URL = "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";
// Kleinere Alternative (ca. 0.4 GB, schwächeres Deutsch):
// "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
export const MODEL_FILE = "nexi-modell.gguf";
export const MIN_BYTES = 300 * 1024 * 1024; // kleiner = Download kaputt
