"""Validate approved content; write atomically only with --apply. Safe to rerun."""
import argparse
import ast
from collections import Counter
from fractions import Fraction
import json
from pathlib import Path
import random
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from database import SessionLocal
from models import Problem, Theory, Theme, ThemeTest, TestQuestion, TestQuestionAnswer
from sqlalchemy import select, func


def value(expression, variables):
    expression = re.sub(r'(?<=[0-9a-z)])(?=[a-z(])', '*', expression)
    def visit(n):
        if isinstance(n, ast.Constant) and isinstance(n.value, int):
            return Fraction(n.value)
        if isinstance(n, ast.Name):
            return Fraction(variables[n.id])
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub):
            return -visit(n.operand)
        if isinstance(n, ast.BinOp):
            a, b = visit(n.left), visit(n.right)
            if isinstance(n.op, ast.Add): return a + b
            if isinstance(n.op, ast.Sub): return a - b
            if isinstance(n.op, ast.Mult): return a * b
            if isinstance(n.op, ast.Div): return a / b
            if isinstance(n.op, ast.Pow): return a ** int(b)
        raise ValueError('Unsupported expression')
    return visit(ast.parse(expression.replace('^', '**'), mode='eval').body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    data = json.loads((ROOT / 'content/approved_exercises.json').read_text(encoding='utf-8'))
    rows, test = data['problems'], data['test']
    assert len(rows) == 115 and len(test['questions']) == 12
    rng = random.Random(42)
    checked = 0
    for row in rows + test['questions']:
        expression = row.get('verification_expression')
        answer = row.get('correct_answer', row.get('expected_answer'))
        if expression and ';' not in answer:
            for _ in range(30):
                variables = {v: rng.choice([-5, -3, -2, -1, 1, 2, 3, 5]) for v in 'xyabz'}
                assert value(expression, variables) == value(answer, variables), expression
            checked += 1
    fields = ['theory_id', 'level_id', 'question', 'correct_answer', 'explanation',
              'hint', 'max_attempts', 'is_official', 'is_active', 'order_index']
    for row in rows:
        assert 0 < len(row['correct_answer']) <= 30
        assert row['hint'] and len(row['explanation']) >= 100
    for q in test['questions']:
        assert len(q['answers']) == 4 and sum(a['is_correct'] for a in q['answers']) == 1
        assert len({a['answer'] for a in q['answers']}) == 4
    with SessionLocal() as db, db.begin():
        theme = db.get(Theme, test['theme_id'])
        assert theme and theme.title == 'Цели изрази' and theme.is_active
        new, found = [], []
        for row in rows:
            theory = db.get(Theory, row['theory_id'])
            assert theory and theory.is_active and theory.level_id == row['level_id']
            existing = db.scalars(select(Problem).where(
                Problem.theory_id == row['theory_id'], Problem.question == row['question'])).all()
            assert len(existing) <= 1, 'Duplicate exercise already exists'
            if existing:
                p = existing[0]
                assert all(getattr(p, key) == row[key] for key in fields), 'Existing content differs'
                found.append(p)
            else:
                conflict = db.scalar(select(Problem.id).where(
                    Problem.theory_id == row['theory_id'], Problem.is_official.is_(True),
                    Problem.order_index == row['order_index']))
                assert conflict is None, 'Exercise position occupied; review before importing'
                new.append(Problem(**{key: row[key] for key in fields}))
        existing_test = db.scalar(select(ThemeTest).where(
            ThemeTest.theme_id == test['theme_id'], ThemeTest.title == test['title']))
        if existing_test:
            assert existing_test.is_active and len(existing_test.questions) == 12
            for actual, expected in zip(existing_test.questions, test['questions']):
                for key in ['question', 'question_type', 'points', 'order_index']:
                    assert getattr(actual, key) == expected[key]
                assert len(actual.answers) == 4
                for a, e in zip(actual.answers, expected['answers']):
                    assert all(getattr(a, key) == e[key] for key in e)
        else:
            assert db.scalar(select(ThemeTest.id).where(
                ThemeTest.theme_id == test['theme_id'], ThemeTest.is_active.is_(True))) is None, 'Another active test exists'
        report = {'mode': 'apply' if args.apply else 'dry-run', 'new_problems': len(new),
                  'existing_problems': len(found), 'new_test': existing_test is None,
                  'independently_checked_expressions': checked, 'substitutions_each': 30,
                  'per_theory': dict(Counter(r['theory_id'] for r in rows))}
        if args.apply:
            db.add_all(new)
            if existing_test is None:
                version = (db.scalar(select(func.max(ThemeTest.version)).where(
                    ThemeTest.theme_id == test['theme_id'])) or 0) + 1
                existing_test = ThemeTest(title=test['title'], theme_id=test['theme_id'], version=version,
                    is_active=True, badge_threshold_percent=test['badge_threshold_percent'])
                for q in test['questions']:
                    question = TestQuestion(**{k: q[k] for k in ['question', 'question_type', 'points', 'order_index']})
                    question.answers = [TestQuestionAnswer(**a) for a in q['answers']]
                    existing_test.questions.append(question)
                db.add(existing_test)
            db.flush()
            report.update(problem_ids=[p.id for p in found + new], test_id=existing_test.id)
    # Read from a fresh session after commit and compare every persisted field.
    if args.apply:
        with SessionLocal() as db:
            saved = db.scalars(select(Problem).where(Problem.id.in_(report['problem_ids']))).all()
            assert len(saved) == 115
            expected = {(r['theory_id'], r['question']): r for r in rows}
            for p in saved:
                row = expected[(p.theory_id, p.question)]
                assert all(getattr(p, key) == row[key] for key in fields)
            saved_test = db.get(ThemeTest, report['test_id'])
            assert saved_test.is_active and len(saved_test.questions) == 12
            assert sum(q.points for q in saved_test.questions) == 25
            assert all(len(q.answers) == 4 and sum(a.is_correct for a in q.answers) == 1 for q in saved_test.questions)
        report['verified_after_commit'] = True
        (ROOT / 'content/import_receipt.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
