import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock
from fastapi import HTTPException
from pydantic import ValidationError
from helpers.schoolclass_helpers import get_student_for_teacher
from schemas.user_schemas import StudentProfileUpdate, TeacherProfileUpdate


class ProfileAndClassAccessTests(unittest.TestCase):
    def test_profile_names_fit_database_columns(self):
        for schema in (StudentProfileUpdate, TeacherProfileUpdate):
            for field in ('first_name', 'last_name'):
                with self.subTest(schema=schema.__name__, field=field):
                    self.assertEqual(getattr(schema(**{field: 'a' * 30}), field), 'a' * 30)
                    with self.assertRaises(ValidationError):
                        schema(**{field: 'a' * 31})

    def test_admin_can_read_student_without_teacher_profile(self):
        db = MagicMock()
        student = SimpleNamespace(class_id=None)
        db.get.return_value = student
        user = SimpleNamespace(role='student', is_superuser=True, teacher=None)
        self.assertIs(get_student_for_teacher(1, user, db), student)

    def test_teacher_cannot_read_another_teachers_student(self):
        db = MagicMock()
        db.get.return_value = SimpleNamespace(class_id=4, school_class=SimpleNamespace(teacher_id=2))
        user = SimpleNamespace(role='teacher', is_superuser=False, teacher=SimpleNamespace(id=1))
        with self.assertRaises(HTTPException) as error:
            get_student_for_teacher(1, user, db)
        self.assertEqual(error.exception.status_code, 403)
