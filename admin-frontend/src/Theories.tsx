import {
    BooleanField, Create, Datagrid, Edit, EditButton,
    List, NumberField, NumberInput, ReferenceField, ReferenceInput,
    SaveButton, SelectInput, SimpleForm, TextField, TextInput,
    Toolbar, minValue, required,
} from "react-admin";
import { StatusButton } from "./StatusButton";
import { MathTextInput } from "./MathTextInput";

const orderValidation = [required(), minValue(1)];

const theoryFilters = [
    <TextInput key="q" source="q" label="Search theories" alwaysOn />,
    <ReferenceInput
        key="level_id" source="level_id" reference="levels" alwaysOn
    >
        <SelectInput optionText="title" label="Level" />
    </ReferenceInput>,
];

const TheoryEditToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <StatusButton />
    </Toolbar>
);

const TheoryFields = () => (
    <>
        <TextInput
            source="title" label="Title" validate={required()} fullWidth
        />

        <MathTextInput
            source="content" label="Content" validate={required()}
        />

        <NumberInput
            source="order_index" label="Order"
            validate={orderValidation} min={1} step={1}
        />
    </>
);

export const TheoryList = () => (
    <List
        title="Theories" filters={theoryFilters}
        sort={{ field: "order_index", order: "ASC" }} perPage={25}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <TextField source="title" label="Title" />

            <ReferenceField
                source="level_id" reference="levels" label="Level" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <NumberField source="order_index" label="Order" />
            <BooleanField source="is_active" label="Active" />
            <EditButton />
            <StatusButton />
        </Datagrid>
    </List>
);

export const TheoryCreate = () => (
    <Create title="Create theory" redirect="list">
        <SimpleForm defaultValues={{ order_index: 1 }}>
            <ReferenceInput source="level_id" reference="levels">
                <SelectInput
                    optionText="title" label="Level"
                    validate={required()} fullWidth
                />
            </ReferenceInput>

            <TheoryFields />
        </SimpleForm>
    </Create>
);

export const TheoryEdit = () => (
    <Edit title="Edit theory" mutationMode="pessimistic" redirect="list">
        <SimpleForm toolbar={<TheoryEditToolbar />}>
            <TextInput source="id" label="ID" disabled />

            <ReferenceField
                source="level_id" reference="levels" label="Level" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <TheoryFields />

            <BooleanField source="is_active" label="Active" />
        </SimpleForm>
    </Edit>
);