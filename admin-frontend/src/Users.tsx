import {
    ArrayField, BooleanField, BooleanInput, Create, Datagrid, DeleteWithConfirmButton, Edit, EditButton,
    EmailField, List, ListButton, NullableBooleanInput, NumberField,
    SelectInput, Show, ShowButton, SimpleShowLayout, TextField,
    TextInput, TopToolbar, useRecordContext, SimpleForm, PasswordInput, required, email,
} from "react-admin";
import { Typography } from "@mui/material";
import { StatusButton } from "./StatusButton";

const userFilters = [
    <TextInput
        key="email" source="email" label="Search email" alwaysOn
    />,
    <SelectInput
        key="role" source="role" label="Role" alwaysOn
        choices={[
            { id: "student", name: "Student" },
            { id: "teacher", name: "Teacher" },
        ]}
    />,
    <NullableBooleanInput
        key="is_active" source="is_active" label="Active" alwaysOn
    />,
];

export const UserCreate = () => (
    <Create title="Create user" redirect="show">
        <SimpleForm defaultValues={{
            role: "student", is_active: true, is_superuser: false, is_verified: false,
        }}>
            <TextInput source="email" type="email" validate={[required(), email()]} fullWidth />
            <PasswordInput source="password" label="Password" autoComplete="new-password"
                validate={required()} fullWidth />
            <SelectInput source="role" label="Role" validate={required()} choices={[
                { id: "student", name: "Student" },
                { id: "teacher", name: "Teacher" },
            ]} />
            <BooleanInput source="is_active" label="Active" />
            <BooleanInput source="is_verified" label="Verified" />
            <BooleanInput source="is_superuser" label="Administrator"
                helperText="Grants access to the admin panel, independently of the selected role." />
        </SimpleForm>
    </Create>
);

function UserActions() {
    const record = useRecordContext();

    if (!record || record.is_superuser) return null;

    return (
        <>
            <StatusButton />

            <DeleteWithConfirmButton
                label="Delete permanently"
                mutationMode="pessimistic"
                redirect="list"
                confirmTitle="Permanently delete user"
                confirmContent="This permanently deletes the account and related data. This cannot be undone."
            />
        </>
    );
}

export const UserList = () => (
    <List
        title="Users" filters={userFilters}
        sort={{ field: "email", order: "ASC" }} perPage={25}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <EmailField source="email" />
            <TextField source="role" />
            <BooleanField source="is_active" label="Active" />
            <BooleanField source="is_verified" label="Verified" />
            <BooleanField source="is_superuser" label="Administrator" />
            <ShowButton />
            <EditButton />
        </Datagrid>
    </List>
);

function UserProfile() {
    const record = useRecordContext();

    if (record?.student) {
        return (
            <SimpleShowLayout>
                <Typography variant="h6">Student profile</Typography>

                <TextField
                    source="student.first_name" label="First name" emptyText="—"
                />
                <TextField
                    source="student.last_name" label="Last name" emptyText="—"
                />
                <NumberField source="student.level" label="Level" />
                <NumberField source="student.points" label="Points" />
                <NumberField
                    source="student.class_id" label="Class ID" emptyText="—"
                />
            </SimpleShowLayout>
        );
    }

    if (record?.teacher) {
        return (
            <SimpleShowLayout>
                <Typography variant="h6">Teacher profile</Typography>

                <TextField
                    source="teacher.first_name" label="First name" emptyText="—"
                />
                <TextField
                    source="teacher.last_name" label="Last name" emptyText="—"
                />

                <ArrayField source="teacher.classes" label="Classes">
                    <Datagrid bulkActionButtons={false} rowClick={false}>
                        <NumberField source="id" />
                        <TextField source="name" />
                        <TextField source="class_code" label="Class code" />
                    </Datagrid>
                </ArrayField>
            </SimpleShowLayout>
        );
    }

    return null;
}

export const UserShow = () => (
    <Show
        title="User details"
        actions={
            <TopToolbar>
                <ListButton />
                <EditButton />
                <UserActions />
            </TopToolbar>
        }
    >
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <EmailField source="email" />
            <TextField source="role" />
            <BooleanField source="is_active" label="Active" />
            <BooleanField source="is_verified" label="Verified" />
            <BooleanField source="is_superuser" label="Administrator" />
        </SimpleShowLayout>

        <UserProfile />
    </Show>
);

function ProfileInputs() {
    const record = useRecordContext();
    const profile = record?.role === "student" ? "student" : "teacher";
    return <>
        <TextField source="email" />
        <TextInput source={`${profile}.first_name`} label="Име" fullWidth />
        <TextInput source={`${profile}.last_name`} label="Фамилия" fullWidth />
    </>;
}

export const UserEdit = () => (
    <Edit title="Редактиране на профил" mutationMode="pessimistic" redirect="show">
        <SimpleForm><ProfileInputs /></SimpleForm>
    </Edit>
);
