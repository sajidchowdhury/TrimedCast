const BASE_PATH = "/creativecast";

export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string" && input.startsWith("/api")
      ? `${BASE_PATH}${input}`
      : input;

  return fetch(url, init);
}
