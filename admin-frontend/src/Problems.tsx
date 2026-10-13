import {
    BooleanField, Create, Datagrid, Edit, EditButton,
    List, NumberField, NumberInput, ReferenceField,
    SaveButton, SimpleForm, TextField, TextInput, Toolbar,
    maxLength, minValue, required,
} from "react-admin";
import type { RaRecord } from "react-admin";
import { dataProvider } from "./dataProvider";
import { StatusButton } from "./StatusButton";
import { MathTextInput, MathTextField } from "./MathTextInput";
import { ContentScopeInputs, ContentFilters, ContentListActions } from "./ContentScopeInputs";

const integer = (value: number | null | undefined) =>
    value == null || Number.isInteger(value)
        ? undefined
        : "Enter a whole number.";


const ProblemToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <StatusButton />
    </Toolbar>
);

const ProblemFields = () => (
    <>
        <MathTextInput
            source="question" label="Question" validate={required()}
        />

        <TextInput
            source="correct_answer" label="Correct answer"
            validate={[required(), maxLength(30)]} fullWidth
        />

        <MathTextInput
            source="explanation" label="Explanation" validate={required()}
        />

        <MathTextInput source="hint" label="Hint" />

        <NumberInput
            source="max_attempts" label="Maximum attempts" min={1} step={1}
            validate={[required(), minValue(1), integer]}
        />

        <NumberInput
            source="order_index" label="Order" min={0} step={1}
            validate={[required(), minValue(0), integer]}
        />
    </>
);

async function prepareProblem(data: RaRecord) {
    const { data: theory } = await dataProvider.getOne("theories", {
        id: data.theory_id,
    });

    return { ...data, level_id: theory.level_id };
}

export const ProblemList = () => (
    <List
        title="Problems" actions={<ContentListActions />}
        sort={{ field: "order_index", order: "ASC" }} perPage={25}
    >
        <ContentFilters />
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <MathTextField source="question" label="Question" />

            <ReferenceField
                source="level_id" reference="levels" label="Level" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <ReferenceField
                source="theory_id" reference="theories" label="Theory" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <NumberField source="order_index" label="Order" />
            <BooleanField source="is_official" label="Official" />
            <BooleanField source="is_active" label="Active" />
            <EditButton />
            <StatusButton />
        </Datagrid>
    </List>
);

export const ProblemCreate = () => (
    <Create
        title="Create official problem" redirect="list" transform={prepareProblem}
    >
        <SimpleForm defaultValues={{ order_index: 1, max_attempts: 3 }}>
            <ContentScopeInputs />

            <ProblemFields />
        </SimpleForm>
    </Create>
);

export const ProblemEdit = () => (
    <Edit title="Edit problem" mutationMode="pessimistic" redirect="list">
        <SimpleForm toolbar={<ProblemToolbar />}>
            <TextInput source="id" label="ID" disabled />

            <ReferenceField
                source="level_id" reference="levels" label="Level" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <ReferenceField
                source="theory_id" reference="theories" label="Theory" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <ProblemFields />

            <BooleanField source="is_official" label="Official" />
            <BooleanField source="is_active" label="Active" />
        </SimpleForm>
    </Edit>
);
