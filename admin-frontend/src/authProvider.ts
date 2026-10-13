import type { AuthProvider } from "react-admin";
import { apiRequest } from "./api";

const TOKEN_KEY = "mathmaster_admin_token";

export const authProvider: AuthProvider = {
    async login({ username, password }) {
        localStorage.removeItem(TOKEN_KEY);

        const body = new URLSearchParams({ username, password });
        const result = await apiRequest("/auth/token", {
            method: "POST",
            body,
        });

        const user = await apiRequest("/users/me", {}, result.access_token);

        if (!user.is_superuser) {
            throw new Error("Access is restricted to administrators.");
        }

        localStorage.setItem(TOKEN_KEY, result.access_token);
    },

    async logout() {
        localStorage.removeItem(TOKEN_KEY);
    },

    async checkAuth() {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            throw new Error("Please log in.");
        }

        const user = await apiRequest("/users/me", {}, token);

        if (!user.is_superuser) {
            throw new Error("Access is restricted to administrators.");
        }
    },

    async checkError(error) {
        if (error.status === 401 || error.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            throw new Error("Please log in again with an administrator account.");
        }
    },
};
