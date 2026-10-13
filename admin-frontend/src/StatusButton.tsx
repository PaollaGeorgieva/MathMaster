import { useState } from "react";
import Button from "@mui/material/Button";
import {
    Confirm,
    useDataProvider,
    useNotify,
    useRecordContext,
    useRefresh,
    useResourceContext,
} from "react-admin";

export const StatusButton = () => {
    const record = useRecordContext();
    const resource = useResourceContext();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!record || !resource || typeof record.is_active !== "boolean") {
        return null;
    }

    const isActive = record.is_active;
    const label = isActive ? "Deactivate" : "Activate";

    async function handleConfirm() {
        if (busy || !record || !resource) return;

        setBusy(true);

        try {
            if (isActive) {
                await dataProvider.deactivate(resource, { id: record.id });
            } else {
                await dataProvider.activate(resource, { id: record.id });
            }

            setOpen(false);
            notify(
                isActive
                    ? "Record deactivated successfully."
                    : "Record activated successfully.",
                { type: "success" }
            );
            refresh();
        } catch (error) {
            notify(
                error instanceof Error ? error.message : "The operation failed.",
                { type: "error" }
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Button
                color={isActive ? "warning" : "success"}
                disabled={busy}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen(true);
                }}
            >
                {label}
            </Button>

            <Confirm
                isOpen={open}
                loading={busy}
                title={`${label} record`}
                content={`Are you sure you want to ${label.toLowerCase()} this record?`}
                confirm={label}
                cancel="Cancel"
                onConfirm={handleConfirm}
                onClose={() => {
                    if (!busy) setOpen(false);
                }}
            />
        </>
    );
};