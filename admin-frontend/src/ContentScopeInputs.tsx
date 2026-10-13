import { Box } from "@mui/material";
import {
    AutocompleteInput, CreateButton, ExportButton, FilterLiveForm, ReferenceInput,
    TextInput, TopToolbar, required, useListContext,
} from "react-admin";
import type { RaRecord } from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";

const sort = { field: "order_index", order: "ASC" as const };
const optionLabel = (record: RaRecord) =>
    `${record.order_index}. ${record.title} (#${record.id})${record.is_active === false ? " — Inactive" : ""}`;

export function ContentScopeInputs({ filtering = false }: { filtering?: boolean }) {
    const { setValue } = useFormContext();
    const themeId = useWatch({ name: "theme_id" });
    const levelId = useWatch({ name: "level_id" });
    const validation = filtering ? undefined : required();
    const clear = (field: string) => setValue(field, null, { shouldDirty: true, shouldValidate: true });

    return <>
        <ReferenceInput source="theme_id" reference="themes" sort={sort} perPage={25}>
            <AutocompleteInput label="Theme" optionText={optionLabel} fullWidth
                validate={validation} onChange={() => { clear("level_id"); clear("theory_id"); }}
                helperText={filtering ? false : "Select a theme first."} />
        </ReferenceInput>
        <ReferenceInput key={`levels-${themeId ?? ""}`} source="level_id" reference="levels" sort={sort} perPage={25}
            filter={{ theme_id: themeId }} enableGetChoices={() => Boolean(themeId)}>
            <AutocompleteInput label="Level" optionText={optionLabel}
                fullWidth disabled={!themeId} validate={validation}
                onChange={() => clear("theory_id")}
                helperText={filtering ? false : "Levels from the selected theme."} />
        </ReferenceInput>
        <ReferenceInput key={`theories-${levelId ?? ""}`} source="theory_id" reference="theories" sort={sort} perPage={25}
            filter={{ level_id: levelId }} enableGetChoices={() => Boolean(levelId)}>
            <AutocompleteInput label="Theory" optionText={optionLabel}
                fullWidth disabled={!levelId} validate={validation}
                helperText={filtering ? false : "Type to search theories in the selected level."} />
        </ReferenceInput>
    </>;
}

export function ContentFilters() {
    return <FilterLiveForm>
        <Box sx={{ display: "grid", gap: 2, p: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
            <ContentScopeInputs filtering />
            <TextInput source="q" label="Search content" resettable helperText={false} fullWidth />
        </Box>
    </FilterLiveForm>;
}

export function ContentListActions() {
    const { filterValues } = useListContext();
    const record = Object.fromEntries(
        ["theme_id", "level_id", "theory_id"]
            .filter(field => filterValues[field] != null && filterValues[field] !== "")
            .map(field => [field, filterValues[field]])
    );
    return <TopToolbar><CreateButton state={{ record }} /><ExportButton /></TopToolbar>;
}
