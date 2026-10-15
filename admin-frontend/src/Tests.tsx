import Alert from "@mui/material/Alert";
import {
    AutocompleteInput, BooleanField, Create, Datagrid, Edit, EditButton,
    FunctionField, List, NumberField, NumberInput, ReferenceField,
    ReferenceInput, ReferenceManyField, SaveButton, SimpleForm,
    TextField, TextInput, Toolbar, maxLength, maxValue, minValue,
    required, useRecordContext,
} from "react-admin";
import type { RaRecord } from "react-admin";
import { ContentDeleteButton } from "./ContentDeleteButton";
import { StatusButton } from "./StatusButton";

const integer = (value: number | null | undefined) =>
    value == null || Number.isInteger(value) ? undefined : "Enter a whole number.";

const testFilters = [
    <TextInput key="q" source="q" label="Search tests" alwaysOn />,
    <ReferenceInput key="theme_id" source="theme_id" reference="themes" alwaysOn>
        <AutocompleteInput optionText="title" label="Theme" />
    </ReferenceInput>,
];

const TestToolbar = () => {
    const record = useRecordContext();

    return (
        <Toolbar sx={{ gap: 2 }}>
            <SaveButton disabled={record?.is_active === true} />
            <StatusButton />
            <ContentDeleteButton />
        </Toolbar>
    );
};

const TestFields = () => (
    <>
        <TextInput
            source="title" label="Title"
            validate={[required(), maxLength(100)]} fullWidth
        />
        <NumberInput
            source="badge_threshold_percent" label="Badge threshold (%)"
            min={0} max={100} step={1}
            validate={[required(), minValue(0), maxValue(100), integer]}
        />
    </>
);

export const TestList = () => (
    <List
        title="Tests" filters={testFilters}
        sort={{ field: "version", order: "DESC" }} perPage={25}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <TextField source="title" label="Title" />
            <ReferenceField source="theme_id" reference="themes" label="Theme" link="edit">
                <TextField source="title" />
            </ReferenceField>
            <NumberField source="version" label="Version" />
            <FunctionField
                label="Questions" sortable={false}
                render={(record: RaRecord) => record.questions?.length ?? 0}
            />
            <BooleanField source="is_active" label="Active" />
            <EditButton />
            <StatusButton />
            <ContentDeleteButton />
        </Datagrid>
    </List>
);

export const TestCreate = () => (
    <Create title="Create test version" redirect="edit">
        <SimpleForm defaultValues={{ badge_threshold_percent: 70 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
                New tests are inactive. Add exactly 12 questions before activation.
            </Alert>
            <ReferenceInput source="theme_id" reference="themes">
                <AutocompleteInput
                    optionText="title" label="Theme"
                    validate={required()} fullWidth
                />
            </ReferenceInput>
            <TestFields />
        </SimpleForm>
    </Create>
);

export const TestEdit = () => (
    <Edit title="Edit test" mutationMode="pessimistic" redirect={false}>
        <>
            <SimpleForm toolbar={<TestToolbar />}>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Active tests and tests with submitted attempts cannot be edited.
                    Activating this version deactivates the other versions of the same theme.
                    Use Test questions in the menu to add questions.
                </Alert>
                <TextInput source="id" label="ID" disabled />
                <ReferenceField source="theme_id" reference="themes" label="Theme" link="edit">
                    <TextField source="title" />
                </ReferenceField>
                <NumberField source="version" label="Version" />
                <TestFields />
                <BooleanField source="is_active" label="Active" />
            </SimpleForm>

            <h3>Questions in this test</h3>

            <ReferenceManyField
                reference="test_questions" target="test_id"
                sort={{ field: "order_index", order: "ASC" }} perPage={12}
            >
                <Datagrid rowClick="edit" bulkActionButtons={false}>
                    <NumberField source="order_index" label="Order" />
                    <TextField source="question" label="Question" />
                    <TextField source="question_type" label="Type" />
                    <NumberField source="points" label="Points" />
                    <EditButton />
                </Datagrid>
            </ReferenceManyField>
        </>
    </Edit>
);