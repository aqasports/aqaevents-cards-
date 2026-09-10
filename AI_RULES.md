# AI AGENT RULES AND CONSTRAINTS

## CRITICAL NOTICE FOR ALL AI AGENTS AND AUTOMATED TOOLS
(Claude Code, Cursor, Copilot, Antigravity, Windsurf, ChatGPT, Codex, and all LLM agents)

---

### 1. INDEPENDENT AND SEPARATE PROJECT SYSTEM
- This directory (`aqa event` / AQA Events Card System) is a **completely separate, standalone, mission-critical production system**.
- It is **NOT** part of `aqasportsdotpro` (AQA Sports platform) or any other project, website, or repository.
- Never apply changes, prompts, features, or refactors intended for other projects to this repository.
- Never assume rules or code from other projects apply here unless the user explicitly specifies.

---

### 2. STRICT EDIT BAN -- NO EDITS WITHOUT SPECIFIC USER APPROVAL
- **Default mode is strictly READ-ONLY.**
- **NEVER** edit, modify, create, overwrite, rename, move, or delete ANY file inside this directory without specific, explicit, and direct user approval for that exact action.
- Before making any modification, the agent must explain the proposed change and wait for explicit confirmation from the user.
- If an automated tool is asked to perform a task across multiple folders, it must **HALT** and ask for confirmation before touching any file in this directory.

---

### 3. NO AUTOMATIC COMMITS OR PUSHES
- **NEVER** run `git commit` without explicit user instruction.
- **NEVER** run `git push` without explicit user instruction.
- **NEVER** trigger automatic deployments (e.g. Netlify deploy) unless the user explicitly requests it.
- All automatic deployment policies in other documentation files are superseded by this rule: **NO commits or pushes until specifically requested by the user.**

---

### 4. STRICT PRODUCTION DATABASE SAFETY
- **NEVER** touch the live production database under any circumstances.
- **NEVER** modify `prisma/schema.prisma` without explicit user approval.
- **NEVER** run `prisma db push`, `prisma migrate reset`, `prisma migrate dev`, or `prisma db execute`.
- **NEVER** run seed scripts (`seed.ts`, `seed-aqa-activities.js`, `seed-missing.mjs`, etc.).
- **NEVER** execute SQL commands containing DELETE, DROP, TRUNCATE, or ALTER.
- The production database credentials exist ONLY in Netlify environment variables and must never be exposed or modified.

---

### 5. STYLE AND CONVENTIONS
- **No emojis anywhere** -- not in code, comments, documentation, UI strings, translations, git commits, or responses.
- **Standard Western Arabic numerals only (0-9)** -- even in Arabic translations. Never use Eastern Arabic-Indic numerals.
