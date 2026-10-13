import Alert from "@mui/material/Alert";
import {
    ArrayInput, AutocompleteInput, BooleanInput, Create, Datagrid,
    DeleteWithConfirmButton, Edit, EditButton, List, NumberField,
    NumberInput, ReferenceField, ReferenceInput, SaveButton,
    SelectInput, SimpleForm, SimpleFormIterator, TextField,
    TextInput, Toolbar, minValue, required,
} from "react-admin";
import type { RaRecord } from "react-admin";

type Answer = {
    answer?: string;
    is_correct?: boolean;
};

const integer = (value: number | null | undefined) =>
    value == null || Number.isInteger(value) ? undefined : "Enter a whole number.";

const questionTypes = [
    { id: "single_choice", name: "Single choice" },
    { id: "short_answer", name: "Short answer" },
];

const testLabel = (record: RaRecord) =>
    `#${record.id} — ${record.title} (v${record.version})`;

function validateAnswers(
    value: Answer[] | undefined,
    values: { question_type?: string },
) {
    const answers = value ?? [];

    if (values.question_type === "single_choice" && answers.length < 2) {
        return "Single choice questions require at least two answers.";
    }

    if (values.question_type === "short_answer" && answers.length !== 1) {
        return "Short answer questions require exactly one answer.";
    }

    if (answers.filter(answer => answer.is_correct).length !== 1) {
        return "Mark exactly one answer as correct.";
    }

    return undefined;
}

function prepareQuestion(data: RaRecord, options?: { previousData?: RaRecord }) {
    const result: RaRecord = {
        ...data,
        answers: (data.answers ?? []).map((answer: Answer, index: number) => ({
            answer: answer.answer,
            is_correct: answer.is_correct ?? false,
            order_index: index + 1,
        })),
    };

    // Avoid unnecessary reordering when only the text or answers change.
    if (options?.previousData?.order_index === result.order_index) {
        delete result.order_index;
    }

    return result;
}

const questionFilters = [
    <TextInput key="q" source="q" label="Search questions" alwaysOn />,
    <ReferenceInput key="test_id" source="test_id" reference="tests" alwaysOn>
        <AutocompleteInput optionText={testLabel} label="Test" />
    </ReferenceInput>,
];

const QuestionToolbar = () => (
    <Toolbar sx={{ gap: 2 }}>
        <SaveButton />
        <DeleteWithConfirmButton mutationMode="pessimistic" redirect="list" />
    </Toolbar>
);

const QuestionFields = () => (
    <>
        <TextInput
            source="question" label="Question" multiline minRows={4}
            validate={required()} fullWidth
        />
        <SelectInput
            source="question_type" label="Question type"
            choices={questionTypes} validate={required()}
        />
        <NumberInput
            source="points" label="Points" min={1} step={1}
            validate={[required(), minValue(1), integer]}
        />
        <NumberInput
            source="order_index" label="Order in test" min={1} step={1}
            validate={[required(), minValue(1), integer]}
            helperText="For new questions, choose an unused order. When editing, use a position within the current question count."
        />
        <Alert severity="info" sx={{ mb: 2 }}>
            Single choice: at least two answers, exactly one correct.
            Short answer: exactly one answer, marked as correct.
            Adjust the answer rows when changing the question type.
        </Alert>
        <ArrayInput source="answers" label="Answers" validate={validateAnswers}>
            <SimpleFormIterator>
                <TextInput
                    source="answer" label="Answer"
                    validate={required()} fullWidth
                />
                <BooleanInput
                    source="is_correct" label="Correct answer"
                    defaultValue={false}
                />
            </SimpleFormIterator>
        </ArrayInput>
    </>
);

export const TestQuestionList = () => (
    <List
        title="Test questions" filters={questionFilters}
        sort={{ field: "order_index", order: "ASC" }} perPage={25}
    >
        <Datagrid rowClick="edit" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <ReferenceField source="test_id" reference="tests" label="Test" link="edit">
                <TextField source="title" />
            </ReferenceField>
            <TextField source="question" label="Question" />
            <TextField source="question_type" label="Type" />
            <NumberField source="points" label="Points" />
            <NumberField source="order_index" label="Order" />
            <EditButton />
        </Datagrid>
    </List>
);

export const TestQuestionCreate = () => (
    <Create
        title="Create test question" redirect="list"
        transform={prepareQuestion}
    >
        <SimpleForm defaultValues={{
            question_type: "single_choice",
            points: 1,
            order_index: 1,
            answers: [
                { answer: "", is_correct: true },
                { answer: "", is_correct: false },
            ],
        }}>
            <ReferenceInput
                source="test_id" reference="tests"
                filter={{ is_active: false }}
            >
                <AutocompleteInput
                    optionText={testLabel} label="Test"
                    validate={required()} fullWidth
                    helperText="Only inactive tests are listed. Tests with attempts cannot be modified."
                />
            </ReferenceInput>
            <QuestionFields />
        </SimpleForm>
    </Create>
);

export const TestQuestionEdit = () => (
    <Edit
        title="Edit test question" mutationMode="pessimistic"
        redirect="list" transform={prepareQuestion}
    >
        <SimpleForm toolbar={<QuestionToolbar />}>
            <Alert severity="info" sx={{ mb: 2 }}>
                The backend allows editing and deletion only for inactive tests without attempts.
            </Alert>
            <TextInput source="id" label="ID" disabled />
            <ReferenceField source="test_id" reference="tests" label="Test" link="edit">
                <TextField source="title" />
            </ReferenceField>
            <QuestionFields />
        </SimpleForm>
    </Edit>
);