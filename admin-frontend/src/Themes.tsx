import {
    BooleanField,
    BooleanInput,
    Create,
    Datagrid,
    Edit,
    EditButton,
    List,
    NumberField,
    NumberInput,
    SaveButton,
    SimpleForm,
    TextField,
    TextInput,
    Toolbar,
    maxLength,
    minValue,
    required,
} from "react-admin";
import { StatusButton } from "./StatusButton";

const titleValidation = [required(), maxLength(30)];
const orderValidation = [required(), minValue(0)];

const themeFilters = [
    <TextInput key="q" source="q" label="Search themes" alwaysOn />,
    <BooleanInput key="is_active" source="is_active" label="Active" />,
];

const ThemeEditToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <StatusButton />
    </Toolbar>
);

export const ThemeList = () => (
    <List
        title="Themes"
        filters={themeFilters}
        sort={{ field: "order_index", order: "ASC" }}
        perPage={25}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <TextField source="title" label="Title" />
            <NumberField source="order_index" label="Order" />
            <BooleanField source="is_active" label="Active" />
            <EditButton />
            <StatusButton />
        </Datagrid>
    </List>
);

export const ThemeCreate = () => (
    <Create title="Create theme" redirect="list">
        <SimpleForm defaultValues={{ is_active: false, order_index: 1 }}>
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
            <BooleanInput
                source="is_active"
                label="Active"
                helperText="Keep the theme inactive while preparing its content."
            />
        </SimpleForm>
    </Create>
);

export const ThemeEdit = () => (
    <Edit title="Edit theme" mutationMode="pessimistic" redirect="list">
        <SimpleForm toolbar={<ThemeEditToolbar />}>
            <TextInput source="id" label="ID" disabled />
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