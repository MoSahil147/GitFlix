---
name: feedback_preserve_comments
description: User wants all existing code comments preserved exactly as written — do not remove, rewrite, or clean up comments
metadata:
  type: feedback
---

Preserve all existing comments exactly as written, even informal ones. The user has invested time writing comments to understand the code and does not want them touched.

**Why:** User explicitly stated "I have taken time to comment and understand" — comments are their learning notes, not noise.

**How to apply:** When editing any file, leave every comment line untouched. Only change executable code. Do not "clean up" comments as part of simplification or refactoring tasks.
