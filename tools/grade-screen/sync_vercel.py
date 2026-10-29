"""Copy the condition check into the Vercel Python function's bundle (apps/dashboard/api/_grade_screen).

Vercel builds the dashboard with apps/dashboard as the root, so the function cannot import from tools/.
Run after editing condition.py or centering.py: `python3 tools/grade-screen/sync_vercel.py`.
test_api.py fails if the copies drift.
"""
import os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, "..", "..", "apps", "dashboard", "api", "_grade_screen")
FILES = ("condition.py", "centering.py")

if __name__ == "__main__":
    os.makedirs(DEST, exist_ok=True)
    for f in FILES:
        shutil.copyfile(os.path.join(HERE, f), os.path.join(DEST, f))
        print("copied", f)
