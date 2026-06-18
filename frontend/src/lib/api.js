import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 20000 });

export async function fetchInsights(label, { lang = "en", hint = null, food = 0 } = {}) {
  const params = { label, lang };
  if (hint) params.hint = hint;
  if (food) params.food = 1;
  const { data } = await client.get("/insights", { params });
  return data;
}

export async function identifyImage(imageBase64) {
  try {
    const { data } = await client.post("/identify", { image_base64: imageBase64 });
    return data?.label || null;
  } catch {
    return null;
  }
}
