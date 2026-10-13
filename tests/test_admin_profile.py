import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4
from fastapi import HTTPException
from pydantic import ValidationError
from routers.users import update_profile_admin
from routers.problems import get_teacher_catalog
from schemas.user_schemas import AdminProfileUpdate


class AdminProfileTests(unittest.TestCase):
    def test_student_cannot_read_teacher_answers_or_edit_profiles(self):
        user = SimpleNamespace(role='student', is_superuser=False)
        session = MagicMock()
        with self.assertRaises(HTTPException) as error:
            get_teacher_catalog(user, session)
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            update_profile_admin(uuid4(), AdminProfileUpdate(first_name='Ива'), user, session)
        self.assertEqual(error.exception.status_code, 403)
        session.commit.assert_not_called()

    def test_admin_updates_names_only_and_keeps_omitted_fields(self):
        for role in ['student', 'teacher']:
            with self.subTest(role=role):
                profile = SimpleNamespace(first_name='Ива',last_name='Иванова',points=120)
                target = SimpleNamespace(role=role,student=profile if role=='student' else None,
                    teacher=profile if role=='teacher' else None)
                session = MagicMock()
                session.get.return_value = target
                result = update_profile_admin(uuid4(), AdminProfileUpdate(first_name='  Мария  '),
                    SimpleNamespace(is_superuser=True), session)
                self.assertIs(result,target)
                self.assertEqual(profile.first_name,'Мария')
                self.assertEqual(profile.last_name,'Иванова')
                self.assertEqual(profile.points,120)
                session.commit.assert_called_once()

    def test_profile_validation_matches_database(self):
        for payload in [{'first_name':'x'*31},{'is_superuser':True},{'points':999}]:
            with self.assertRaises(ValidationError):
                AdminProfileUpdate(**payload)
