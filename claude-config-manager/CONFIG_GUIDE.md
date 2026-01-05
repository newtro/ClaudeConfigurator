# Claude Code Configuration Guide

This guide provides a comprehensive overview of the configuration ecosystem for Claude Code. Claude uses a hierarchical configuration system that allows for enterprise policies, global user preferences, and project-specific overrides.

---

## 🏢 Enterprise Layer

System-wide policies managed by IT administrators. These settings are enforced across the entire machine or organization and **cannot be overridden** by users.

**Location:**
- **Windows:** `C:\Program Files\ClaudeCode\`
- **macOS:** `/Library/Application Support/ClaudeCode/`
- **Linux/WSL:** `/etc/claude-code/`

### `CLAUDE.md` (Enterprise)

**Purpose:**
An enterprise-level "Rulebook" that provides baseline coding standards applied to every developer in the organization, regardless of the project. This has the highest priority in the memory hierarchy.

### `managed-settings.json`

**Purpose:**
Organization-wide enforcement settings. Settings defined here **cannot** be overridden by users. Typically used for:
- Enforcing strict tool permissions (e.g., forbidding network access)
- Defining approved API endpoints or proxies
- Setting global security and privacy guardrails

### `managed-mcp.json`

**Purpose:**
Enterprise-wide MCP server configuration. Defines organization-approved external tool integrations and data source connections.

---

## 👤 User Global Layer

Personal preferences that follow you across all projects on your local machine.

**Location:** `~/.claude/` (plus `~/.claude.json` for MCP)

### `CLAUDE.md`

**Location:** `~/.claude/CLAUDE.md`

**Purpose:**
Your personal default coding rules and context. Loaded for all projects before project-level instructions. Use for:
- Personal coding style preferences
- Frequently used shortcuts and patterns
- Custom tool configurations you want everywhere

### `CLAUDE.local.md`

**Location:** `~/.claude/CLAUDE.local.md`

**Purpose:**
Machine-specific personal instructions that are not synced across devices. Useful when you work on multiple computers with different configurations.

### `settings.json`

**Location:** `~/.claude/settings.json`

**Purpose:**
Your primary personal control panel. Key configurations include:
- **Tool Permissions**: Set `allow`, `ask`, or `deny` for specific commands
- **Environment Variables**: Global variables Claude should have access to
- **UI Preferences**: CLI theme, font settings, and auto-complete behavior

### `settings.local.json`

**Location:** `~/.claude/settings.local.json`

**Purpose:**
Machine-specific overrides. If you work across multiple computers, this file allows different settings that aren't synced.

### `~/.claude.json` (MCP)

**Location:** `~/.claude.json` (note: in home directory, NOT inside `.claude/`)

**Purpose:**
User-level **Model Context Protocol (MCP)** server configuration. MCP allows Claude to securely connect to external data sources like:
- Local databases (SQLite, PostgreSQL)
- Cloud services (Google Drive, GitHub)
- Specialized tools (web search, file systems)

**Important:** MCP servers configured here are available across all your projects.

### `commands/`

**Location:** `~/.claude/commands/`

**Purpose:**
Global custom slash commands available across all projects. Each `.md` file becomes a command you can invoke anywhere. Commands support:
- Arguments via `$ARGUMENTS`, `$1`, `$2`, etc.
- File references via `@path/to/file`
- Bash command execution via `!`backtick syntax

### `agents/`

**Location:** `~/.claude/agents/`

**Purpose:**
Global AI agent (subagent) definitions for complex, multi-step workflows. Define specialized Claude instances for tasks like deployment, security audits, or code reviews.

### `skills/`

**Location:** `~/.claude/skills/`

**Purpose:**
Custom modular abilities. Each subdirectory represents a specialized "Skill" Claude can use. Format: Each skill folder must contain a `SKILL.md` file defining how and when the skill should be triggered.

---

## 📁 Project Layer

Specific rules and context for a single repository. These are usually shared with your team via version control.

### `CLAUDE.md` (Project Root)

**Location:** `[ProjectRoot]/CLAUDE.md` (most common location)

**Purpose:**
The "Source of Truth" for your project context. This is the first file Claude reads when entering a project. Should contain:
- **Build/Test Commands**: How to run your project
- **Style Guides**: Naming conventions, architectural patterns
- **Project Structure**: High-level explanation of the codebase layout

### `.claude/CLAUDE.md` (Alternative Location)

**Location:** `[ProjectRoot]/.claude/CLAUDE.md`

**Purpose:**
Alternative location for project instructions inside the `.claude` directory. Use this if you prefer to keep all Claude configuration together in one folder.

### `CLAUDE.local.md`

**Location:** `[ProjectRoot]/CLAUDE.local.md`

**Purpose:**
Personal project-specific overrides. **Automatically gitignored** by Claude. Perfect for:
- Sandbox URLs and test environments
- Personal debugging preferences
- Private test data or credentials

### `.claude/settings.json`

**Location:** `[ProjectRoot]/.claude/settings.json`

**Purpose:**
Project-specific behavioral settings. Typically **checked into Git** so the whole team shares:
- Tool permissions for this project
- MCP server configurations
- Environment context

### `.claude/settings.local.json`

**Location:** `[ProjectRoot]/.claude/settings.local.json`

**Purpose:**
Personal project-specific tweaks. **Ignored by Git**. Perfect for individual debugging flags or secrets that shouldn't be shared.

### `.claude/rules/`

**Location:** `[ProjectRoot]/.claude/rules/`

**Purpose:**
Modular project rules. Each `.md` file defines topic-specific guidelines that are loaded as needed:
- `testing.md` - Testing conventions and patterns
- `security.md` - Security requirements
- `api.md` - API design guidelines

### `.claude/commands/`

**Location:** `[ProjectRoot]/.claude/commands/`

**Purpose:**
Project-specific custom slash commands. Each `.md` file becomes a command for this project. Use for:
- Deployment workflows
- Testing patterns
- Code generation templates

### `.claude/agents/`

**Location:** `[ProjectRoot]/.claude/agents/`

**Purpose:**
Project-specific subagent definitions for complex workflows unique to this codebase.

### `.mcp.json`

**Location:** `[ProjectRoot]/.mcp.json`

**Purpose:**
Project-level MCP server configuration. Defines project-specific tool integrations that are:
- Shared with the team (checked into Git)
- Scoped to just this project
- Different from your global MCP configuration

---

## 📂 Subdirectory Layer

Module-specific instructions for complex projects with distinct areas.

### `CLAUDE.md` (Subdirectory)

**Location:** Any subdirectory, e.g., `[ProjectRoot]/src/billing/CLAUDE.md`

**Purpose:**
Instructions specific to a module or feature area. Claude discovers these **on-demand** when accessing files in that subdirectory. Useful for:
- Complex module documentation
- Special handling rules for legacy code
- Domain-specific terminology and patterns
- Module-specific build or test commands

### `CLAUDE.local.md` (Subdirectory)

**Purpose:**
Personal overrides for specific modules. Auto-gitignored like other `.local.md` files.

**Discovery Behavior:**
- Claude reads CLAUDE.md files **recursively upward** from your current working directory
- Subdirectory CLAUDE.md files are **loaded on-demand** when Claude accesses files in those directories
- This keeps context focused and prevents token waste on irrelevant code areas

---

## 🔄 Hierarchy of Truth

If a setting is defined in multiple places, Claude resolves it in this order (top priority wins):

1. **Enterprise managed settings** (Highest priority - Cannot be overridden)
2. **Command line arguments** (Temporary session overrides)
3. **Project Local Settings** (`.claude/settings.local.json`)
4. **Project Settings** (`.claude/settings.json`)
5. **User Local Settings** (`~/.claude/settings.local.json`)
6. **User Global Settings** (`~/.claude/settings.json`) (Lowest priority)

### Memory Priority (CLAUDE.md files)

1. **Enterprise CLAUDE.md** (Highest)
2. **User CLAUDE.md** (`~/.claude/CLAUDE.md`)
3. **Parent directory memories** (traversed upward)
4. **Project CLAUDE.md** (`./CLAUDE.md` or `./.claude/CLAUDE.md`)
5. **Project rules** (`./.claude/rules/*.md`)
6. **Project CLAUDE.local.md** (Lowest)

---

## 📚 Additional Features

### File Imports

CLAUDE.md files can import additional content using `@path/to/file` syntax:

```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
```

### Slash Command Format

Commands support frontmatter for metadata:

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*)
argument-hint: [message]
description: Create a git commit
model: claude-3-5-haiku-20241022
---

Create a git commit with message: $ARGUMENTS
```

### View Current Memory

Use the `/memory` slash command during a session to see all loaded memory files and their sources.
