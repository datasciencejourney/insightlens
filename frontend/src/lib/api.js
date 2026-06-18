import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 20000 });

/** label: detected class, lang: wiki locale (en/hi/es/fr), hint: optional OCR text, food: 1 to force recipe lookup */
export async function fetchInsights(label, { lang = "en", hint = null, food = 0 } = {}) {
  const params = { label, lang };
  if (hint) params.hint = hint;
  if (food) params.food = 1;
  const { data } = await client.get("/insights", { params });
  return data;
}

/**
 * Ask Claude Vision (via our backend, which holds the API key) what the
 * single most prominent object in a base64 JPEG is. Returns a clean
 * lowercase label string, or null if Claude Vision isn't configured /
 * the call failed -- callers should fall back to the on-device guess.
 */
export async function identifyImage(imageBase64) {
  try {
    const { data } = await client.post("/identify", { image_base64: imageBase64 });
    return data?.label || null;
  } catch {
    return null;
  }
}

