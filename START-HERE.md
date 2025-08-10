# START HERE - Documentation Guide

Welcome! This project uses a structured documentation system with clear boundaries. **Read this first** to understand where to find what you need.

## 📁 Documentation Structure

### Four Types of Documentation, Four Clear Purposes

| Document/Folder | Purpose                | When to Use                                        |
| --------------- | ---------------------- | -------------------------------------------------- |
| **README.md**   | Get started fast       | You want to clone → run → contribute in 30 minutes |
| **OVERVIEW.md** | Understand the project | You need the "why" and high-level "how"            |
| **docs/**       | Use the service        | You're integrating with or consuming the API       |
| **specs/**      | Active development     | You're planning or implementing new features       |

## 🎯 Hard Boundaries (No Overlap)

### README.md - "Git Clone to First Commit"

- **ONLY**: Setup, quick start, basic architecture
- **RULE**: If it's not needed to start contributing in 30 minutes, it doesn't belong here
- **INCLUDES**: Installation, dev environment, basic project structure

### OVERVIEW.md - "Project Context at 10,000 Feet"

- **ONLY**: Vision (why this exists) + Architecture (high-level design)
- **RULE**: The "big picture" understanding of the project
- **INCLUDES**: Problem statement, solution approach, key design decisions

### docs/ - "External Consumption"

- **ONLY**: API documentation, user guides, integration examples
- **RULE**: If you're using the service (not developing it), it's here
- **INCLUDES**: API reference, setup guides for users, examples

### specs/ - "Active Development Brain"

- **ONLY**: Sprint planning and feature development context
- **RULE**: Current and future work planning
- **INCLUDES**: `requirements.md`, `design.md`, `tasks.md` for each sprint

## 🧭 Navigation Guide

**I want to...**

- **Get the project running locally** → Start with README.md
- **Understand what this project does and why** → Read OVERVIEW.md
- **Use this API in my application** → Go to docs/index.md
- **Contribute a new feature** → Check specs/ for current work
- **Understand a design decision** → Look in the relevant specs/sprint-N/ folder

## 📋 The One-Home Rule

Every piece of information has exactly **ONE** location:

- **Setup instructions**: README.md only
- **API documentation**: docs/ only
- **Feature planning**: specs/ only
- **Architecture overview**: OVERVIEW.md only

**No duplicates. No exceptions.**

## 🤖 For AI Assistants

When working on this project:

1. **Always read START-HERE.md first** to understand the documentation boundaries
2. **Check specs/** for current development context
3. **Follow the hard boundaries** - don't create redundant documentation
4. **Update the appropriate location** based on the type of change you're making

---

**Questions?** Check if your question fits one of the four documentation types above, then go to that location. Still stuck? The answer probably belongs in one of these four places - help improve the system by adding it there!
