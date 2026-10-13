import { Admin, Resource } from "react-admin";
import { Layout } from "./Layout";
import { authProvider } from "./authProvider";
import { adminDataProvider } from "./adminDataProvider";

import { ThemeList, ThemeCreate, ThemeEdit } from "./Themes";
import { LevelList, LevelCreate, LevelEdit } from "./Levels";
import { TheoryList, TheoryCreate, TheoryEdit } from "./Theories";
import { ExampleList, ExampleCreate, ExampleEdit } from "./Examples";
import { ProblemList, ProblemCreate, ProblemEdit } from "./Problems";
import { TestList, TestCreate, TestEdit } from "./Tests";
import {
    TestQuestionList, TestQuestionCreate, TestQuestionEdit,
} from "./TestQuestions";
import { UserList, UserShow, UserCreate, UserEdit } from "./Users";

export const App = () => (
    <Admin
        layout={Layout}
        authProvider={authProvider}
        dataProvider={adminDataProvider}
        requireAuth
    >
        <Resource
            name="themes"
            options={{ label: "Themes" }}
            recordRepresentation="title"
            list={ThemeList}
            create={ThemeCreate}
            edit={ThemeEdit}
        />
        <Resource
            name="levels"
            options={{ label: "Levels" }}
            recordRepresentation="title"
            list={LevelList}
            create={LevelCreate}
            edit={LevelEdit}
        />
        <Resource
            name="theories"
            options={{ label: "Theories" }}
            recordRepresentation="title"
            list={TheoryList}
            create={TheoryCreate}
            edit={TheoryEdit}
        />
        <Resource
            name="example_problems"
            options={{ label: "Examples" }}
            recordRepresentation="question"
            list={ExampleList}
            create={ExampleCreate}
            edit={ExampleEdit}
        />
        <Resource
            name="problems"
            options={{ label: "Problems" }}
            recordRepresentation="question"
            list={ProblemList}
            create={ProblemCreate}
            edit={ProblemEdit}
        />
        <Resource
            name="tests"
            options={{ label: "Tests" }}
            recordRepresentation={record => `${record.title} (v${record.version})`}
            list={TestList}
            create={TestCreate}
            edit={TestEdit}
        />
        <Resource
            name="test_questions"
            options={{ label: "Test questions" }}
            recordRepresentation="question"
            list={TestQuestionList}
            create={TestQuestionCreate}
            edit={TestQuestionEdit}
        />
        <Resource
            name="users"
            options={{ label: "Users" }}
            recordRepresentation="email"
            list={UserList}
            create={UserCreate}
            show={UserShow}
            edit={UserEdit}
        />
    </Admin>
);
