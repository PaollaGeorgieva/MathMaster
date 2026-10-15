import { DeleteWithConfirmButton } from "react-admin";

export const ContentDeleteButton = () => (
    <DeleteWithConfirmButton
        mutationMode="pessimistic"
        redirect="list"
        label="Delete permanently"
        confirmTitle="Permanently delete content"
        confirmContent="This deletes the selected content and its dependent content. Content with student progress cannot be deleted. This cannot be undone."
    />
);
