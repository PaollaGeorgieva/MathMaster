"""Update only the imported practice wording, preserving IDs and student progress."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from models import Problem
folder = Path(__file__).resolve().parent
before = json.loads((folder / 'exercises_before_compact_revision.json').read_text(encoding='utf-8'))['problems']
after = json.loads((folder / 'approved_exercises.json').read_text(encoding='utf-8'))['problems']
assert len(before) == len(after) == 115
with SessionLocal() as db, db.begin():
    changed = 0
    for old, new in zip(before, after):
        assert (old['theory_id'],old['order_index'],old['correct_answer']) == (new['theory_id'],new['order_index'],new['correct_answer'])
        p = db.query(Problem).filter_by(theory_id=old['theory_id'],order_index=old['order_index'],is_official=True).one()
        assert p.correct_answer == old['correct_answer']
        for field in ['question','explanation','hint']:
            assert getattr(p,field) in (old[field],new[field]), f'Edited content: {p.id}, {field}'
            setattr(p,field,new[field])
        changed += 1
print(f'Updated {changed} exercises; IDs, answers and progress preserved.')
