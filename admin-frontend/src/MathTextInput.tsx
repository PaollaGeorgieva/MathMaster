import { useEffect, useRef, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { InputHelperText, useInput, useRecordContext } from "react-admin";
import type { InputProps } from "react-admin";
import { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";

MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

type Part = {
    id: string;
    type: "text" | "math";
    value: string;
};

const part = (type: Part["type"], value = ""): Part => ({
    id: crypto.randomUUID(),
    type,
    value,
});

function splitContent(value: string): Part[] {
    const parts: Part[] = [];
    const pattern = /\\\(([\s\S]*?)\\\)/g;
    let start = 0;

    for (const match of value.matchAll(pattern)) {
        const index = match.index!;
        parts.push(part("text", value.slice(start, index)));
        parts.push(part("math", match[1]));
        start = index + match[0].length;
    }

    parts.push(part("text", value.slice(start)));
    return parts;
}

function joinContent(parts: Part[]) {
    return parts.map(item =>
        item.type === "math" ? "\\(" + item.value + "\\)" : item.value
    ).join("");
}

const validateFormulas = (value: string | null | undefined) =>
    splitContent(value ?? "").some(item =>
        item.type === "math" &&
        (!item.value.trim() || item.value.includes("\\placeholder"))
    ) ? "Complete or remove empty formulas." : undefined;

type FormulaProps = {
    value: string;
    readOnly?: boolean;
    onChange?: (value: string) => void;
    onBlur?: () => void;
};

function Formula({ value, readOnly = false, onChange, onBlur }: FormulaProps) {
    const host = useRef<HTMLSpanElement>(null);
    const element = useRef<MathfieldElement | null>(null);
    const callbacks = useRef({ onChange, onBlur });
    callbacks.current = { onChange, onBlur };

    useEffect(() => {
        const mathfield = new MathfieldElement();
        mathfield.mathModeSpace = "\\;";
        mathfield.readOnly = readOnly;
        mathfield.mathVirtualKeyboardPolicy = readOnly ? "manual" : "auto";
        mathfield.setAttribute(
            "aria-label",
            readOnly ? "Formula preview" : "Formula"
        );
        mathfield.style.cssText = readOnly
            ? "border:0;background:transparent;color:inherit;padding:0;pointer-events:none;"
            : "width:100%;min-width:0;background:transparent;color:inherit;";

        if (readOnly) mathfield.tabIndex = -1;

        const input = () => callbacks.current.onChange?.(mathfield.value);
        const blur = () => callbacks.current.onBlur?.();
        const keydown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || event.isComposing || readOnly) return;
            event.preventDefault();
            event.stopPropagation();
            mathfield.executeCommand("addRowAfter");
        };

        mathfield.addEventListener("input", input);
        mathfield.addEventListener("blur", blur);
        mathfield.addEventListener("keydown", keydown, true);
        host.current?.appendChild(mathfield);
        element.current = mathfield;

        return () => {
            mathfield.removeEventListener("input", input);
            mathfield.removeEventListener("blur", blur);
            mathfield.removeEventListener("keydown", keydown, true);
            mathfield.remove();
            element.current = null;
        };
    }, [readOnly]);

    useEffect(() => {
        if (element.current && element.current.value !== value) {
            element.current.setValue(value, { silenceNotifications: true });
        }
    }, [value, readOnly]);

    return (
        <span
            ref={host}
            style={{ display: readOnly ? "inline" : "block", minWidth: 0 }}
        />
    );
}

export function MathPreview({ value }: { value: string }) {
    return (
        <Box sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 2 }}>
            {splitContent(value).map((item, index) =>
                item.type === "math"
                    ? <Formula key={index} value={item.value} readOnly />
                    : <span key={index}>{item.value}</span>
            )}
        </Box>
    );
}

export function MathTextField({ source }: { source: string; label?: string }) {
    const record = useRecordContext();
    return <MathPreview value={String(record?.[source] ?? "")} />;
}

type MathTextInputProps = {
    source: string;
    label: string;
    validate?: InputProps["validate"];
};

export function MathTextInput({ source, label, validate }: MathTextInputProps) {
    const validators = validate
        ? (Array.isArray(validate) ? validate : [validate])
        : [];

    const { field, fieldState, formState, isRequired } = useInput({
        source,
        defaultValue: "",
        validate: [...validators, validateFormulas],
    });

    const value = String(field.value ?? "");
    const [parts, setParts] = useState(() => splitContent(value));
    const lastValue = useRef(value);
    const textElements = useRef(
        new Map<string, HTMLInputElement | HTMLTextAreaElement>()
    );

    const showError =
        fieldState.invalid && (fieldState.isTouched || formState.isSubmitted);

    useEffect(() => {
        if (value !== lastValue.current) {
            lastValue.current = value;
            setParts(splitContent(value));
        }
    }, [value]);

    const saveParts = (next: Part[]) => {
        const content = joinContent(next);
        lastValue.current = content;
        setParts(next);
        field.onChange(content);
    };

    const updatePart = (id: string, content: string) =>
        saveParts(parts.map(item =>
            item.id === id ? { ...item, value: content } : item
        ));

    const insertFormula = (index: number) => {
        const current = parts[index];
        const position =
            textElements.current.get(current.id)?.selectionStart
            ?? current.value.length;

        saveParts([
            ...parts.slice(0, index),
            { ...current, value: current.value.slice(0, position) },
            part("math"),
            part("text", current.value.slice(position)),
            ...parts.slice(index + 1),
        ]);
    };

    const removeFormula = (index: number) => {
        const previous = parts[index - 1];
        const next = parts[index + 1];

        saveParts([
            ...parts.slice(0, index - 1),
            { ...previous, value: previous.value + next.value },
            ...parts.slice(index + 2),
        ]);

        field.onBlur();
    };

    return (
        <Box sx={{ width: "100%", mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>
                {label}{isRequired ? " *" : ""}
            </Typography>

            <Stack spacing={1}>
                {parts.map((item, index) =>
                    item.type === "text" ? (
                        <Box key={item.id}>
                            <TextField
                                label="Text"
                                value={item.value}
                                multiline
                                minRows={1}
                                fullWidth
                                error={showError}
                                onChange={event =>
                                    updatePart(item.id, event.target.value)
                                }
                                onBlur={() => field.onBlur()}
                                inputRef={(
                                    node: HTMLInputElement | HTMLTextAreaElement | null
                                ) => {
                                    if (node) textElements.current.set(item.id, node);
                                    else textElements.current.delete(item.id);

                                    if (index === 0) field.ref(node);
                                }}
                            />

                            <Button
                                type="button"
                                size="small"
                                onClick={() => insertFormula(index)}
                            >
                                Insert formula
                            </Button>
                        </Box>
                    ) : (
                        <Box
                            key={item.id}
                            sx={{
                                p: 1,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                            }}
                        >
                            <Formula
                                value={item.value}
                                onChange={content => updatePart(item.id, content)}
                                onBlur={() => field.onBlur()}
                            />

                            <Button
                                type="button"
                                size="small"
                                color="error"
                                onClick={() => removeFormula(index)}
                            >
                                Remove formula
                            </Button>
                        </Box>
                    )
                )}
            </Stack>

            <InputHelperText
                error={showError ? fieldState.error?.message : undefined}
                helperText="Place the cursor in the text, then select Insert formula."
            />

            <Box
                sx={{
                    mt: 1,
                    p: 2,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Preview
                </Typography>

                <MathPreview value={joinContent(parts)} />
            </Box>
        </Box>
    );
}
