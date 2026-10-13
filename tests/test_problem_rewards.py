import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from helpers.gamification_helpers import (
    award_problem_points,
    get_or_create_problem_progress,
    record_hint_use,
)
from helpers.problem_helpers import create_attempt
from models import Problem
from schemas import SubmitAnswer


class FirstAnswerRewardsTests(unittest.TestCase):
    def test_first_answer_before_flush(self):
        for use_hint, correct in [(False, True), (True, True), (False, False)]:
            with self.subTest(use_hint=use_hint, correct=correct):
                session = MagicMock()
                session.query.return_value.filter_by.return_value.first.return_value = None
                user = SimpleNamespace(id=uuid4())
                problem = Problem(id=1, correct_answer='A', hint='Compare the expressions')
                if use_hint:
                    progress = record_hint_use(session=session, user_id=user.id, problem=problem)
                else:
                    progress = get_or_create_problem_progress(
                        session=session, user_id=user.id, problem_id=problem.id)
                self.assertEqual(progress.points_awarded, 0)
                self.assertIs(progress.hint_used, use_hint)
                attempt = create_attempt(session, user.id, problem,
                    SubmitAnswer(submitted_answer='A' if correct else 'B'), 1, progress.hint_used)
                self.assertIs(attempt.is_correct, correct)
                self.assertIs(attempt.used_hint, use_hint)
                with patch('helpers.gamification_helpers.add_profile_points') as add_points:
                    if correct:
                        result = award_problem_points(session=session, user=user, progress=progress)
                        expected = (10, 0, 10) if use_hint else (10, 5, 15)
                        self.assertEqual(result, expected)
                        self.assertEqual(progress.points_awarded, expected[2])
                        add_points.assert_called_once_with(session=session, user=user, points=expected[2])
                        self.assertEqual(award_problem_points(
                            session=session, user=user, progress=progress), (0, 0, 0))
                        self.assertEqual(add_points.call_count, 1)
                    else:
                        self.assertEqual(progress.points_awarded, 0)
                        add_points.assert_not_called()
                session.flush.assert_not_called()

    def test_existing_progress_is_preserved(self):
        session = MagicMock()
        existing = SimpleNamespace(points_awarded=10, hint_used=True)
        session.query.return_value.filter_by.return_value.first.return_value = existing
        self.assertIs(get_or_create_problem_progress(
            session=session, user_id=uuid4(), problem_id=1), existing)
        session.add.assert_not_called()


if __name__ == '__main__':
    unittest.main()
