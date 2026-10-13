import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4
from fastapi import HTTPException
from routers.problems import get_teacher_catalog

class CatalogTests(unittest.TestCase):
    def test_teacher_query_reaches_database(self):
        db = MagicMock()
        query = db.query.return_value
        query.join.return_value = query
        query.filter.return_value = query
        query.order_by.return_value = query
        query.all.return_value = []
        self.assertEqual(get_teacher_catalog(SimpleNamespace(role='teacher', is_superuser=False, id=uuid4()), db), [])
        query.all.assert_called_once()

    def test_student_cannot_read_answers(self):
        db = MagicMock()
        with self.assertRaises(HTTPException) as error:
            get_teacher_catalog(SimpleNamespace(role='student', is_superuser=False), db)
        self.assertEqual(error.exception.status_code, 403)
        db.query.assert_not_called()
