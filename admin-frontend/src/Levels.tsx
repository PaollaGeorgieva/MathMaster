import {
    BooleanField,
    Create,
    Datagrid,
    Edit,
    EditButton,
    List,
    NumberField,
    NumberInput,
    ReferenceField,
    ReferenceInput,
    SaveButton,
    SelectInput,
    SimpleForm,
    TextField,
    TextInput,
    Toolbar,
    maxLength,
    minValue,
    required,
} from "react-admin";
import { ContentDeleteButton } from "./ContentDeleteButton";
import { StatusButton } from "./StatusButton";

const titleValidation = [required(), maxLength(30)];
const orderValidation = [required(), minValue(0)];

const levelFilters = [
    <TextInput key="q" source="q" label="Search levels" alwaysOn />,
    <ReferenceInput
        key="theme_id"
        source="theme_id"
        reference="themes"
        alwaysOn
    >
        <SelectInput optionText="title" label="Theme" />
    </ReferenceInput>,
];

const LevelEditToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <StatusButton />
            <ContentDeleteButton />
    </Toolbar>
);

export const LevelList = () => (
    <List
        title="Levels"
        filters={levelFilters}
        sort={{ field: "order_index", order: "ASC" }}
        perPage={25}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <TextField source="title" label="Title" />
            <ReferenceField source="theme_id" reference="themes" label="Theme" link="edit">
                <TextField source="title" />
            </ReferenceField>
            <NumberField source="order_index" label="Order" />
            <BooleanField source="is_active" label="Active" />
            <EditButton />
            <StatusButton />
            <ContentDeleteButton />
        </Datagrid>
    </List>
);

export const LevelCreate = () => (
    <Create title="Create level" redirect="list">
        <SimpleForm defaultValues={{ order_index: 1 }}>
            <ReferenceInput source="theme_id" reference="themes">
                <SelectInput
                    optionText="title"
                    label="Theme"
                    validate={required()}
                    fullWidth
                />
            </ReferenceInput>
            <TextInput
                source="title"
                label="Title"
                validate={titleValidation}
                fullWidth
            />
            <TextInput
                source="description"
                label="Description"
                validate={required()}
                multiline
                minRows={4}
                fullWidth
            />
            <NumberInput
                source="order_index"
                label="Order"
                validate={orderValidation}
                min={0}
                step={1}
            />
        </SimpleForm>
    </Create>
);

export const LevelEdit = () => (
    <Edit title="Edit level" mutationMode="pessimistic" redirect="list">
        <SimpleForm toolbar={<LevelEditToolbar />}>
            <TextInput source="id" label="ID" disabled />
            <ReferenceField source="theme_id" reference="themes" label="Theme" link="edit">
                <TextField source="title" />
            </ReferenceField>
            <TextInput
                source="title"
                label="Title"
                validate={titleValidation}
                fullWidth
            />
            <TextInput
                source="description"
                label="Description"
                validate={required()}
                multiline
                minRows={4}
                fullWidth
            />
            <NumberInput
                source="order_index"
                label="Order"
                validate={orderValidation}
                min={0}
                step={1}
            />
            <BooleanField source="is_active" label="Active" />
        </SimpleForm>
    </Edit>
);