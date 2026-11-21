// API Client for Heal Your Heart PHR (Patient Health Record Portal)
const PHR_TOKEN_KEY = "hyh_phr_token";

export function getPhrToken(): string | null {
  return localStorage.getItem(PHR_TOKEN_KEY);
}

export function setPhrToken(token: string): void {
  localStorage.setItem(PHR_TOKEN_KEY, token);
}

export function clearPhrToken(): void {
  localStorage.removeItem(PHR_TOKEN_KEY);
}

export async function phrApi<T = any>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  isFormData: boolean = false
): Promise<T> {
  const token = getPhrToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-PHR-Token"] = token;
  }

  if (!isFormData && body && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const endpoint = `/api/phr${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(endpoint, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    let errDetail = "Request failed";
    try {
      const errJson = await res.json();
      errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errDetail = await res.text();
    }
    throw new Error(errDetail);
  }

  return res.json();
}
