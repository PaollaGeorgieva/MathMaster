const API_URL = import.meta.env.VITE_API_URL;

export { API_URL };

export async function apiRequest(
    path: string,
    options: RequestInit = {},
    token?: string,
) {
    const headers = new Headers(options.headers);

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = typeof data?.detail === "string"
            ? data.detail
            : `Request failed (${response.status})`;

        throw Object.assign(new Error(message), {
            status: response.status,
            body: data,
        });
    }

    return data;
}