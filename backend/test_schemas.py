import time
from schemas import CommitData
from datetime import datetime

# Test1 - Valid Commit
commit = CommitData(
    sha="abc12345",
    author_login="sahil",
    timestamp=datetime.now(),
    message="feat: added github ingestion",
    files_changed=3,
    lines_added=150,
    lines_deleted=20
)

print("Valid commit created!!!")
print(commit)

# test2: will pass wrong data and nnow check
print("\n Testing with wrong data.... haha")
bad_commit=CommitData(
    sha="abc123345",
    author_login="sahilll",
    timestamp=datetime.now(),
    message="feat: add github ingestionn",
    files_changed="Three", # this is wrong, we should use int, but using stringg
    lines_added=150,
    lines_deleted=20
)