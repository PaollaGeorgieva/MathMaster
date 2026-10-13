import {
    BooleanField, Create, Datagrid, Edit, EditButton,
    List, NumberField, NumberInput, ReferenceField,
    SaveButton, SimpleForm, TextField, TextInput, Toolbar,
    minValue, required,
} from "react-admin";
import { StatusButton } from "./StatusButton";
import { MathTextInput, MathTextField } from "./MathTextInput";
import { ContentScopeInputs, ContentFilters, ContentListActions } from "./ContentScopeInputs";

const orderValidation = [required(), minValue(0)];


const ExampleEditToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <StatusButton />
    </Toolbar>
);

const ExampleFields = () => (
    <>
        <MathTextInput
            source="question" label="Question" validate={required()}
        />

        <MathTextInput
            source="solution" label="Solution" validate={required()}
        />

        <NumberInput
            source="order_index" label="Order"
            validate={orderValidation} min={0} step={1}
        />
    </>
);

export const ExampleList = () => (
    <List
        title="Examples" actions={<ContentListActions />}
        sort={{ field: "order_index", order: "ASC" }} perPage={25}
    >
        <ContentFilters />
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <MathTextField source="question" label="Question" />
            <ReferenceField source="theory_id" reference="theories" label="Level" link={false} sortable={false}>
                <ReferenceField source="level_id" reference="levels" link="edit">
                    <TextField source="title" />
                </ReferenceField>
            </ReferenceField>

            <ReferenceField
                source="theory_id" reference="theories" label="Theory" link="edit"
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

export const ExampleCreate = () => (
    <Create title="Create example" redirect="list">
        <SimpleForm defaultValues={{ order_index: 1 }}>
            <ContentScopeInputs />

            <ExampleFields />
        </SimpleForm>
    </Create>
);

export const ExampleEdit = () => (
    <Edit title="Edit example" mutationMode="pessimistic" redirect="list">
        <SimpleForm toolbar={<ExampleEditToolbar />}>
            <TextInput source="id" label="ID" disabled />

            <ReferenceField
                source="theory_id" reference="theories" label="Theory" link="edit"
            >
                <TextField source="title" />
            </ReferenceField>

            <ExampleFields />

            <BooleanField source="is_active" label="Active" />
        </SimpleForm>
    </Edit>
);
