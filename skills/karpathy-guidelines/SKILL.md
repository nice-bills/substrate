---
name: karpathy-guidelines
description: Andrej Karpathy-inspired guidelines for better LLM coding behavior. Think before coding, simplicity first, surgical changes, goal-driven execution.
metadata: {"openclaw":{"emoji":"🧠","category":"guidelines"}}
---

# Karpathy-Inspired Coding Guidelines

## Core Principles

### 1. Think Before Coding
- State assumptions explicitly
- Ask when uncertain, don't guess
- Present multiple interpretations when ambiguity exists
- Push back when a simpler approach exists
- Stop and clarify when confused

### 2. Simplicity First
- Minimum code that solves the problem
- No features beyond what was asked
- No abstractions for single-use code
- No speculative "flexibility"
- If 200 lines could be 50, rewrite it

### 3. Surgical Changes
- Touch only what you must
- Don't "improve" adjacent code
- Match existing style
- Remove only what YOUR changes made unused
- Don't remove pre-existing dead code

### 4. Goal-Driven Execution
- Define success criteria explicitly
- Write tests first, then make them pass
- For multi-step: state plan with verifications
- Loop until verified

## Application to Substrate

### Before Writing Code
```
1. What am I being asked to do?
2. What's the simplest solution?
3. What assumptions am I making?
4. How will I verify success?
```

### When Editing
- Every changed line should trace to the request
- No drive-by refactoring
- Clean up your own orphans only

## References
- Original: https://github.com/forrestchang/andrej-karpathy-skills
- Karpathy's post: https://x.com/karpathy/status/2015883857489522876
