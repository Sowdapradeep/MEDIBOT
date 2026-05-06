const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Base API client for all MediBot portals.
 * Automatically attaches auth token from the current session.
 * Each portal can import and use this directly.
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  tokenProvider?: () => Promise<string | null>
): Promise<Response> {
  let token: string | null = null;

  if (tokenProvider) {
    token = await tokenProvider();
  } else {
    // Attempt to get token from Amplify session
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      token = session.tokens?.idToken?.toString() || null;
    } catch {
      // No active session
    }
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid — could trigger re-auth flow
    console.warn("Unauthorized request to:", endpoint);
  }

  return response;
}

/**
 * Convenience wrapper that auto-parses JSON and throws on error.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `API error ${response.status}: ${response.statusText}${
        errorBody ? ` - ${errorBody}` : ""
      }`
    );
  }

  return response.json();
}
