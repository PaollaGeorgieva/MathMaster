import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import HTTPException
from routers.tests import get_tests, get_test_admin, delete_test_admin


class TestCatalogAccessTests(unittest.TestCase):
    def test_teacher_can_read_catalog_and_test(self):
        user = SimpleNamespace(role='teacher', is_superuser=False)
        session = MagicMock()
        session.query.return_value.order_by.return_value.all.return_value = []
        self.assertEqual(get_tests(user, session=session), [])
        self.assertIs(get_test_admin(1, user, session), session.get.return_value)

    def test_student_cannot_read_answer_catalog(self):
        user = SimpleNamespace(role='student', is_superuser=False)
        session = MagicMock()
        for read in [lambda: get_tests(user, session=session),
                     lambda: get_test_admin(1, user, session)]:
            with self.assertRaises(HTTPException) as error:
                read()
            self.assertEqual(error.exception.status_code, 403)
        session.query.assert_not_called()
        session.get.assert_not_called()

    def test_teacher_cannot_delete_test(self):
        session = MagicMock()
        with self.assertRaises(HTTPException) as error:
            delete_test_admin(1, SimpleNamespace(role='teacher', is_superuser=False), session)
        self.assertEqual(error.exception.status_code, 403)
        session.get.assert_not_called()
