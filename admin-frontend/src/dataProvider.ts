import type {
    DataProvider,
    GetListParams,
    Identifier,
    RaRecord,
} from "react-admin";
import { apiRequest } from "./api";

type Values = Record<string, unknown>;

type ResourceConfig = {
    listUrl: string;
    createUrl: string;
    itemUrl: string;
    createFields: string[];
    updateFields: string[];
    serverFilters: string[];
    supportsActivation: boolean;
};

const resources: Record<string, ResourceConfig> = {
    themes: {
        listUrl: "/themes/admin/all",
        createUrl: "/themes/",
        itemUrl: "/themes",
        createFields: ["title", "description", "order_index", "is_active"],
        updateFields: ["title", "description", "order_index"],
        serverFilters: [],
        supportsActivation: true,
    },
    levels: {
        listUrl: "/levels/admin/all",
        createUrl: "/levels/",
        itemUrl: "/levels",
        createFields: ["title", "description", "order_index", "theme_id"],
        updateFields: ["title", "description", "order_index"],
        serverFilters: ["theme_id"],
        supportsActivation: true,
    },
    theories: {
        listUrl: "/theories/admin/all",
        createUrl: "/theories/",
        itemUrl: "/theories",
        createFields: ["title", "content", "order_index", "level_id"],
        updateFields: ["title", "content", "order_index"],
        serverFilters: ["level_id"],
        supportsActivation: true,
    },
    example_problems: {
        listUrl: "/example_problems/admin/all",
        createUrl: "/example_problems/",
        itemUrl: "/example_problems",
        createFields: ["question", "solution", "order_index", "theory_id"],
        updateFields: ["question", "solution", "order_index"],
        serverFilters: ["level_id", "theory_id"],
        supportsActivation: true,
    },
    problems: {
        listUrl: "/problems/admin/all",
        createUrl: "/problems/",
        itemUrl: "/problems",
        createFields: [
            "question", "correct_answer", "explanation", "order_index",
            "level_id", "theory_id", "max_attempts", "hint",
        ],
        updateFields: [
            "question", "correct_answer", "explanation",
            "order_index", "max_attempts", "hint",
        ],
        serverFilters: ["level_id"],
        supportsActivation: true,
    },
    tests: {
        listUrl: "/tests/admin",
        createUrl: "/tests/admin",
        itemUrl: "/tests/admin",
        createFields: ["title", "theme_id", "badge_threshold_percent"],
        updateFields: ["title", "badge_threshold_percent"],
        serverFilters: ["theme_id"],
        supportsActivation: true,
    },
    test_questions: {
        listUrl: "/tests/admin",
        createUrl: "/tests/admin",
        itemUrl: "/tests/admin/questions",
        createFields: ["question", "question_type", "points", "order_index", "answers"],
        updateFields: ["question", "question_type", "points", "order_index", "answers"],
        serverFilters: [],
        supportsActivation: false,
    },
};

function fail(message: string, status = 400): never {
    throw Object.assign(new Error(message), { status });
}

function getConfig(resource: string): ResourceConfig {
    if (!Object.prototype.hasOwnProperty.call(resources, resource)) {
        fail(`Unsupported resource: ${resource}`);
    }

    return resources[resource];
}

function getToken(): string {
    const token = localStorage.getItem("mathmaster_admin_token");

    if (!token) {
        fail("Please log in.", 401);
    }

    return token;
}

function encodeId(id: Identifier): string {
    return encodeURIComponent(String(id));
}

function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== "";
}

async function request(path: string, method = "GET", body?: Values) {
    return apiRequest(path, {
        method,
        headers: body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    }, getToken());
}

function pickFields(data: Values, fields: string[]): Values {
    return Object.fromEntries(
        fields
            .filter(field => data[field] !== undefined)
            .map(field => [field, data[field]])
    );
}

function makePayload(resource: string, data: Values, creating: boolean): Values {
    const config = getConfig(resource);
    const fields = creating ? config.createFields : config.updateFields;
    const payload = pickFields(data, fields);

    if (resource === "themes" && creating) {
        payload.is_active = data.is_active ?? false;
    }

    if (resource === "problems" && creating) {
        // Official administrator problems are not assigned to classes.
        payload.class_ids = [];
    }

    if (resource === "test_questions" && Array.isArray(payload.answers)) {
        payload.answers = payload.answers.map(answer =>
            pickFields(answer as Values, ["answer", "is_correct", "order_index"])
        );
    }

    return payload;
}

async function loadRecords(resource: string, filters: Values = {}) {
    const config = getConfig(resource);

    if (resource === "test_questions") {
        if (hasValue(filters.test_id)) {
            const test = await request(
                `/tests/admin/${encodeId(String(filters.test_id))}`
            );
            return test.questions;
        }

        const tests = await request("/tests/admin");
        return tests.flatMap((test: RaRecord) => test.questions ?? []);
    }

    const query = new URLSearchParams();

    for (const field of config.serverFilters) {
        if (hasValue(filters[field])) {
            query.set(field, String(filters[field]));
        }
    }

    const suffix = query.size ? `?${query.toString()}` : "";
    return request(`${config.listUrl}${suffix}`);
}

async function loadOne(resource: string, id: Identifier) {
    getConfig(resource);

    if (resource === "tests") {
        return request(`/tests/admin/${encodeId(id)}`);
    }

    // Admin lists include inactive records and administrator-only fields.
    const records = await loadRecords(resource);
    const record = records.find(
        (item: RaRecord) => String(item.id) === String(id)
    );

    if (!record) {
        fail("Record not found.", 404);
    }

    return record;
}

function compareValues(left: unknown, right: unknown): number {
    if (left === right) return 0;
    if (left === undefined || left === null) return -1;
    if (right === undefined || right === null) return 1;

    if (typeof left === "number" && typeof right === "number") {
        return left - right;
    }

    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

async function listRecords(resource: string, params: GetListParams) {
    const config = getConfig(resource);
    const filters: Values = params.filter ?? {};
    let records = await loadRecords(resource, filters);

    // These resources have no theme_id column. Resolve the theme through its levels.
    const hasThemeFilter = hasValue(filters.theme_id)
        && ["problems", "example_problems"].includes(resource);
    if (hasThemeFilter) {
        const levels = await loadRecords("levels", { theme_id: filters.theme_id });
        const levelIds = new Set(levels.map((level: RaRecord) => String(level.id)));
        if (resource === "problems") {
            records = records.filter((item: RaRecord) => levelIds.has(String(item.level_id)));
        } else {
            const theories = await loadRecords("theories", { level_id: filters.level_id });
            const theoryIds = new Set(theories
                .filter((theory: RaRecord) => levelIds.has(String(theory.level_id)))
                .map((theory: RaRecord) => String(theory.id)));
            records = records.filter((item: RaRecord) => theoryIds.has(String(item.theory_id)));
        }
    }

    const search = String(filters.q ?? "").trim().toLowerCase();

    if (search) {
        records = records.filter((item: RaRecord) =>
            ["title", "description", "question", "content"].some(field =>
                String(item[field] ?? "").toLowerCase().includes(search)
            )
        );
    }

    for (const [field, value] of Object.entries(filters)) {
        if (field === "q" || !hasValue(value)) continue;
        if (field === "theme_id" && hasThemeFilter) continue;
        if (config.serverFilters.includes(field)) continue;

        records = records.filter((item: RaRecord) => {
            if (Array.isArray(value)) {
                return value.some(entry => String(item[field]) === String(entry));
            }

            return String(item[field]) === String(value);
        });
    }

    const { field, order } = params.sort ?? {
        field: resource === "tests" ? "version" : "order_index",
        order: resource === "tests" ? "DESC" : "ASC",
    };

    records.sort((left: RaRecord, right: RaRecord) => {
        const result = compareValues(left[field], right[field])
            || compareValues(left.id, right.id);

        return order === "ASC" ? result : -result;
    });

    const total = records.length;

    if (params.pagination) {
        const { page, perPage } = params.pagination;
        const start = (page - 1) * perPage;
        records = records.slice(start, start + perPage);
    }

    return { data: records, total };
}

async function changeActiveState(
    resource: string,
    params: { id: Identifier },
    active: boolean,
) {
    const config = getConfig(resource);

    if (!config.supportsActivation) {
        fail("This resource does not support activation.");
    }

    const action = active ? "activate" : "deactivate";
    await request(`${config.itemUrl}/${encodeId(params.id)}/${action}`, "PATCH");

    // Activation endpoints return Message, so reload the updated record.
    return { data: await loadOne(resource, params.id) };
}

export const dataProvider: DataProvider = {
    getList: listRecords,

    async getOne(resource, params) {
        return { data: await loadOne(resource, params.id) };
    },

    async getMany(resource, params) {
        const records = await loadRecords(resource);
        const ids = new Set(params.ids.map(String));

        return {
            data: records.filter((item: RaRecord) => ids.has(String(item.id))),
        };
    },

    async getManyReference(resource, params) {
        return listRecords(resource, {
            ...params,
            filter: {
                ...params.filter,
                [params.target]: params.id,
            },
        });
    },

    async create(resource, params) {
        const config = getConfig(resource);
        let url = config.createUrl;

        if (resource === "test_questions") {
            if (!hasValue(params.data.test_id)) {
                fail("Select a test before adding a question.");
            }

            url = `/tests/admin/${encodeId(params.data.test_id)}/questions`;
        }

        // Only themes accept is_active in their creation schema.
        if (resource !== "themes" && hasValue(params.data.is_active)) {
            const defaultActive = resource !== "tests";

            if (params.data.is_active !== defaultActive) {
                fail("Use the activation or deactivation action after creation.");
            }
        }

        const payload = makePayload(resource, params.data, true);
        const data = await request(url, "POST", payload);

        return { data };
    },

    async update(resource, params) {
        const config = getConfig(resource);

        if (
            params.data.is_active !== undefined
            && params.data.is_active !== params.previousData?.is_active
        ) {
            fail("Use the activation or deactivation action to change status.");
        }

        // Parent relationships cannot be changed by the existing PATCH endpoints.
        for (const field of ["theme_id", "level_id", "theory_id", "test_id"]) {
            if (
                params.data[field] !== undefined
                && params.previousData?.[field] !== undefined
                && String(params.data[field]) !== String(params.previousData[field])
            ) {
                fail(`Changing ${field} is not supported.`);
            }
        }

        const payload = makePayload(resource, params.data, false);

        if (!Object.keys(payload).length) {
            return { data: await loadOne(resource, params.id) };
        }

        const url = `${config.itemUrl}/${encodeId(params.id)}`;
        const data = await request(url, "PATCH", payload);

        return { data };
    },

    async delete(resource, params) {
        getConfig(resource);

        const deletePaths: Record<string, string> = {
            themes: "/themes", levels: "/levels/admin", theories: "/theories",
            example_problems: "/example_problems", problems: "/problems/admin",
            tests: "/tests/admin", test_questions: "/tests/admin/questions",
        };
        const record = await loadOne(resource, params.id);
        const suffix = resource === "test_questions" ? "" : "/delete";
        await request(`${deletePaths[resource]}/${encodeId(params.id)}${suffix}`, "DELETE");

        return { data: record };
    },

    async updateMany() {
        fail("Bulk updates are not supported. Update records individually.", 405);
    },

    async deleteMany() {
        fail("Bulk deletion is not supported. Manage records individually.", 405);
    },

    async activate(resource: string, params: { id: Identifier }) {
        return changeActiveState(resource, params, true);
    },

    async deactivate(resource: string, params: { id: Identifier }) {
        return changeActiveState(resource, params, false);
    },
};
