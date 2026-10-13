import type {
    DataProvider, GetListParams, Identifier, RaRecord,
} from "react-admin";
import { apiRequest } from "./api";
import { dataProvider as contentProvider } from "./dataProvider";

function unsupported(): never {
    throw Object.assign(
        new Error("This user operation is not supported."),
        { status: 405 }
    );
}

async function request(path: string, method = "GET", body?: Record<string, unknown>) {
    const token = localStorage.getItem("mathmaster_admin_token");

    if (!token) {
        throw Object.assign(new Error("Please log in."), { status: 401 });
    }

    return apiRequest(path, {
        method,
        ...(body !== undefined ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        } : {}),
    }, token);
}

const userUrl = (id: Identifier) =>
    `/users/admin/${encodeURIComponent(String(id))}`;

async function listUsers(params: GetListParams) {
    const query = new URLSearchParams();
    const filters = params.filter ?? {};

    for (const field of ["email", "role", "is_active"]) {
        const value = filters[field];

        if (value !== undefined && value !== null && value !== "") {
            query.set(field, String(value));
        }
    }

    const records = await request(`/users/admin?${query}`);
    const { field, order } = params.sort ?? {
        field: "email",
        order: "ASC",
    };

    records.sort((a: RaRecord, b: RaRecord) => {
        const result = String(a[field] ?? "").localeCompare(
            String(b[field] ?? ""),
            undefined,
            { numeric: true }
        ) || String(a.id).localeCompare(String(b.id));

        return order === "ASC" ? result : -result;
    });

    const total = records.length;
    const { page, perPage } = params.pagination ?? {
        page: 1,
        perPage: total,
    };

    return {
        data: records.slice((page - 1) * perPage, page * perPage),
        total,
    };
}

export const adminDataProvider: DataProvider = {
    ...contentProvider,

    getList(resource, params) {
        return resource === "users"
            ? listUsers(params)
            : contentProvider.getList(resource, params);
    },

    async getOne(resource, params) {
        if (resource !== "users") {
            return contentProvider.getOne(resource, params);
        }

        return { data: await request(userUrl(params.id)) };
    },

    async getMany(resource, params) {
        if (resource !== "users") {
            return contentProvider.getMany(resource, params);
        }

        return {
            data: await Promise.all(
                params.ids.map(id => request(userUrl(id)))
            ),
        };
    },

    getManyReference(resource, params) {
        if (resource === "users") return unsupported();
        return contentProvider.getManyReference(resource, params);
    },

    async create(resource, params) {
        if (resource !== "users") return contentProvider.create(resource, params);

        const { email, password, role, is_superuser, is_active, is_verified } = params.data;
        const data = await request("/auth/admin", "POST", {
            email, password, role,
            is_superuser: is_superuser ?? false,
            is_active: is_active ?? true,
            is_verified: is_verified ?? false,
        });
        return { data };
    },

    async update(resource, params) {
        if (resource === "users") {
            const profile = params.data.student ?? params.data.teacher ?? {};
            return { data: await request(`${userUrl(params.id)}/profile`, "PATCH", {
                first_name: profile.first_name ?? null, last_name: profile.last_name ?? null,
            }) };
        }
        return contentProvider.update(resource, params);
    },

    updateMany(resource, params) {
        if (resource === "users") return unsupported();
        return contentProvider.updateMany(resource, params);
    },

    async delete(resource, params) {
        if (resource !== "users") {
            return contentProvider.delete(resource, params);
        }

        const record = await request(userUrl(params.id));
        await request(userUrl(params.id), "DELETE");

        return { data: record };
    },

    deleteMany(resource, params) {
        if (resource === "users") return unsupported();
        return contentProvider.deleteMany(resource, params);
    },

    async activate(resource: string, params: { id: Identifier }) {
        if (resource !== "users") {
            return contentProvider.activate(resource, params);
        }

        await request(`${userUrl(params.id)}/activate`, "PATCH");
        return { data: await request(userUrl(params.id)) };
    },

    async deactivate(resource: string, params: { id: Identifier }) {
        if (resource !== "users") {
            return contentProvider.deactivate(resource, params);
        }

        await request(`${userUrl(params.id)}/deactivate`, "PATCH");
        return { data: await request(userUrl(params.id)) };
    },
};
