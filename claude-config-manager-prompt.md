# Claude Code Configuration Manager - Development Prompt

## Project Overview

Build a cross-platform desktop application called **"Claude Config Manager"** (or "Configsmith") that provides a unified interface for managing all Claude Code configuration across the entire hierarchy. The app should auto-discover existing configurations, provide visual editing, and include an AI assistant powered by the Anthropic API to help users understand, debug, and optimize their Claude Code setup.

## Target Platform & Tech Stack

### Recommended Stack
- **Framework**: Electron or Tauri (prefer Tauri for smaller bundle size and Rust backend)
- **Frontend**: React + TypeScript + Tailwind CSS
- **State Management**: Zustand or Jotai
- **UI Components**: shadcn/ui or Radix UI primitives
- **Backend/IPC**: Rust (if Tauri) or Node.js (if Electron)
- **Database**: SQLite (for caching/history) via better-sqlite3 or rusqlite
- **Markdown Editor**: Monaco Editor or CodeMirror 6
- **JSON Editor**: Monaco Editor with JSON schema validation

### Why Cross-Platform Desktop
- Needs filesystem access to read/write configuration files across multiple locations
- Must detect OS-specific paths (Windows, macOS, Linux)
- Should run as a background service option for monitoring changes

---

## Claude Code Configuration Hierarchy

The app must understand and manage the complete Claude Code configuration hierarchy:

### Memory Files (CLAUDE.md) - Instructions/Context
| Level | Location (Windows) | Location (macOS/Linux) | Purpose | Shared |
|-------|-------------------|------------------------|---------|--------|
| Enterprise | `C:\Program Files\ClaudeCode\CLAUDE.md` | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) or `/etc/claude-code/CLAUDE.md` (Linux) | Org-wide policies | All users |
| User | `~/.claude/CLAUDE.md` | `~/.claude/CLAUDE.md` | Personal global preferences | Just you |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Same | Team project instructions | Team (git) |
| Project Local | `./CLAUDE.local.md` | Same | Personal project preferences | Just you (gitignored) |

### Settings Files (JSON) - Permissions/Config
| Level | Location (Windows) | Location (macOS/Linux) | Purpose | Shared |
|-------|-------------------|------------------------|---------|--------|
| Enterprise | `C:\Program Files\ClaudeCode\settings.json` | `/Library/Application Support/ClaudeCode/settings.json` or `/etc/claude-code/settings.json` | Managed security policies | All users |
| User | `~/.claude/settings.json` | `~/.claude/settings.json` | Global user settings | Just you |
| User Local | `~/.claude/settings.local.json` | Same | Machine-specific user settings | Just you |
| Project | `./.claude/settings.json` | Same | Team project settings | Team (git) |
| Project Local | `./.claude/settings.local.json` | Same | Personal project overrides | Just you (gitignored) |

### Other Configuration Files
- **`.claudeignore`** - Files Claude should not read (like .gitignore syntax)
- **`.mcp.json`** - MCP server configurations
- **`~/.claude/agents/`** - Custom AI subagents (Markdown with YAML frontmatter)
- **`.claude/commands/`** - Custom slash commands (Markdown files)
- **`.claude/hooks/`** - Pre/post tool hooks
- **`~/.claude/plugins/`** - Plugin configurations

---

## Core Features

### 1. System Auto-Discovery
On first launch and on-demand refresh:
- Detect operating system and set appropriate paths
- Scan all hierarchy levels for existing configuration files
- Parse and validate all found configurations
- Detect installed Claude Code version (check VS Code extensions, CLI)
- Discover all git repositories with Claude configurations
- Index all custom commands, agents, and hooks
- Detect MCP servers (running and configured)

### 2. Configuration Dashboard
- **Tree View**: Show full hierarchy with visual indicators
  - ✅ File exists and valid
  - ⚠️ File exists but has issues
  - ❌ File missing (optional indicator)
  - 🔒 Read-only (Enterprise level)
- **Quick Stats**: Number of projects, MCP servers, custom commands, etc.
- **Recent Activity**: Recently modified configurations
- **Health Check**: Overall configuration health score

### 3. Visual Editors

#### CLAUDE.md Editor
- Split view: Markdown source + Live preview
- Syntax highlighting for imports (`@path/to/file`)
- Auto-completion for file paths
- Templates for common sections (Commands, Architecture, Standards)
- Diff view when comparing levels
- Import graph visualization

#### Settings.json Editor
- Form-based UI for common settings
- JSON Schema validation
- Auto-complete for permission patterns like:
  - `Bash(npm run:*)`
  - `Read(./.env)`
  - `Write(./src/**)`
  - `Skill(superpowers:*)`
- Visual permission builder (instead of typing patterns)

#### .claudeignore Editor
- Similar to .gitignore editor
- Preview which files would be ignored
- Common patterns library (node_modules, build, etc.)

### 4. MCP Server Manager
- List all configured MCP servers
- Add/Remove/Edit server configurations
- Test server connectivity
- View server capabilities (tools provided)
- Start/Stop/Restart servers
- View server logs
- Template library for common MCP servers:
  - Filesystem
  - GitHub
  - Slack
  - Database connections
  - Custom HTTP APIs

### 5. Custom Commands Manager
- List all commands across all levels
- Create new commands with templates
- Edit command markdown with preview
- Test commands (dry run)
- Organize into folders
- Import/Export command collections

### 6. Agents Manager
- List custom subagents
- Create agents with YAML frontmatter editor
- Define agent capabilities and restrictions
- Test agents in sandbox

### 7. Hooks Manager
- Visual hook builder
- Pre/Post tool hook configuration
- Test hook execution
- Common hook templates:
  - Format on save (Prettier, Black)
  - Lint checking
  - Test running

### 8. Project Scanner
- Scan filesystem for all projects with Claude configs
- Quick switch between projects
- Bulk operations (apply template to multiple projects)
- Project health reports

---

## AI Assistant Integration

### Chat Interface
- Persistent chat sidebar (collapsible)
- Conversation history (stored locally)
- Context-aware: AI knows current configuration state
- Model selector dropdown with latest Anthropic models:
  - claude-opus-4-5-20250514 (default for complex tasks)
  - claude-sonnet-4-5-20250929 (faster responses)
  - claude-haiku-4-5-20251001 (quick queries)

### AI Capabilities

#### Configuration Analysis
- "Analyze my current configuration for issues"
- "Why is this permission not working?"
- "What's the difference between my user and project settings?"
- "Explain what this MCP server does"

#### Debugging Assistant
- "I'm getting a 413 error, help me fix it"
- "My /compact command fails, what should I do?"
- "Claude isn't reading my CLAUDE.md, why?"
- Parse error messages and suggest fixes

#### Web Search Integration
- Search GitHub issues for Claude Code problems
- Search documentation for configuration options
- Find community solutions for common issues
- Link to relevant documentation

#### Configuration Generation
- "Create a CLAUDE.md for a React TypeScript project"
- "Add an MCP server for PostgreSQL"
- "Set up hooks for Python formatting"
- "Generate .claudeignore for a Flutter project"

#### Auto-Fix Capabilities
- Detect and offer to fix:
  - Malformed JSON
  - Invalid permission patterns
  - Missing required fields
  - Conflicting settings across levels
  - Deprecated configurations

### API Integration
```typescript
interface AnthropicConfig {
  apiKey: string; // Stored securely in OS keychain
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

// Tools the AI assistant should have access to:
const assistantTools = [
  'read_config_file',      // Read any config file
  'write_config_file',     // Write config changes
  'validate_config',       // Validate JSON/Markdown
  'search_web',            // Search for solutions
  'search_github_issues',  // Search Claude Code issues
  'run_claude_code_cmd',   // Execute claude CLI commands
  'get_system_info',       // OS, paths, versions
  'list_mcp_servers',      // List configured servers
  'test_mcp_connection',   // Test server connectivity
];
```

---

## User Interface Design

### Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  Claude Config Manager                              [_][□][X]       │
├──────────────────┬──────────────────────────────────┬───────────────┤
│                  │                                  │               │
│  📁 Hierarchy    │     Main Editor Area             │  🤖 AI Chat   │
│                  │                                  │               │
│  ├─ Enterprise   │  ┌────────────────────────────┐  │  ┌─────────┐  │
│  │  └─ CLAUDE.md │  │                            │  │  │ Model:  │  │
│  │               │  │   [Tabs for open files]    │  │  │ Opus4.5 │  │
│  ├─ User         │  │                            │  │  └─────────┘  │
│  │  ├─ CLAUDE.md │  │                            │  │               │
│  │  ├─ settings  │  │   Editor Content           │  │  Chat history │
│  │  └─ agents/   │  │                            │  │  ...          │
│  │               │  │                            │  │               │
│  ├─ Projects     │  │                            │  │  ┌─────────┐  │
│  │  ├─ StorySpro │  │                            │  │  │ Input   │  │
│  │  ├─ Cogsmith  │  └────────────────────────────┘  │  │         │  │
│  │  └─ ...       │                                  │  └─────────┘  │
│                  │  [Status Bar: Health | Issues]   │               │
└──────────────────┴──────────────────────────────────┴───────────────┘
```

### Themes
- Light and Dark mode
- System preference detection
- Custom accent colors

### Keyboard Shortcuts
- `Ctrl+S` - Save current file
- `Ctrl+Shift+P` - Command palette
- `Ctrl+J` - Toggle AI chat
- `Ctrl+\`` - Toggle terminal/logs
- `F5` - Refresh/rescan configurations

---

## Data Storage

### Local Database Schema
```sql
-- Cache discovered configurations
CREATE TABLE configurations (
  id TEXT PRIMARY KEY,
  level TEXT,           -- enterprise, user, project
  type TEXT,            -- claude_md, settings, claudeignore, mcp
  path TEXT,
  content TEXT,
  hash TEXT,            -- For change detection
  last_scanned DATETIME,
  is_valid BOOLEAN,
  validation_errors TEXT
);

-- Track projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  path TEXT,
  name TEXT,
  last_opened DATETIME,
  has_claude_md BOOLEAN,
  has_settings BOOLEAN,
  has_claudeignore BOOLEAN
);

-- Chat history
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  created_at DATETIME,
  context TEXT          -- What config was being viewed
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,            -- user, assistant
  content TEXT,
  timestamp DATETIME,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- User preferences
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### Secure Storage
- API keys stored in OS keychain (keytar for Electron, keyring for Tauri)
- Never store secrets in plain text or SQLite

---

## Error Handling & Validation

### JSON Validation
- Use JSON Schema for settings.json validation
- Provide clear error messages with line numbers
- Auto-fix common issues (trailing commas, missing quotes)

### Markdown Validation
- Validate CLAUDE.md imports exist
- Check for circular import references
- Warn about very large files (context window concerns)

### Permission Pattern Validation
- Validate glob patterns
- Test patterns against sample file paths
- Warn about overly permissive patterns

---

## Build & Distribution

### Installers
- Windows: MSI/NSIS installer, also portable .exe
- macOS: DMG with app bundle, also Homebrew cask
- Linux: AppImage, .deb, .rpm, also Flatpak

### Auto-Updates
- Check for updates on startup (configurable)
- Download and apply updates in background
- Changelog display

### Telemetry (Optional, Opt-in)
- Anonymous usage statistics
- Crash reporting
- Feature usage to guide development

---

## Development Phases

### Phase 1: Core Foundation
1. Project setup (Tauri + React + TypeScript)
2. OS detection and path resolution
3. File system scanning and parsing
4. Basic tree view UI
5. Simple text editor for configs

### Phase 2: Visual Editors
1. Monaco editor integration
2. CLAUDE.md preview
3. Settings.json form builder
4. .claudeignore editor with preview

### Phase 3: AI Integration
1. Anthropic API client
2. Chat UI component
3. Context injection (current config state)
4. Basic Q&A capabilities

### Phase 4: Advanced Features
1. MCP server manager
2. Custom commands manager
3. Hooks builder
4. Web search integration

### Phase 5: Polish
1. Themes and accessibility
2. Keyboard shortcuts
3. Auto-updates
4. Documentation

---

## File Structure

```
claude-config-manager/
├── src-tauri/                 # Rust backend (if using Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/          # IPC command handlers
│   │   │   ├── filesystem.rs
│   │   │   ├── config.rs
│   │   │   └── mcp.rs
│   │   ├── scanner/           # Config discovery
│   │   ├── validators/        # JSON/MD validation
│   │   └── ai/                # Anthropic client
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Editor.tsx
│   │   │   └── ChatPanel.tsx
│   │   ├── editors/
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── JsonEditor.tsx
│   │   │   └── IgnoreEditor.tsx
│   │   ├── tree/
│   │   │   └── ConfigTree.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   └── ModelSelector.tsx
│   │   └── ui/                # shadcn components
│   ├── hooks/
│   │   ├── useConfig.ts
│   │   ├── useAI.ts
│   │   └── useScanner.ts
│   ├── stores/
│   │   ├── configStore.ts
│   │   └── chatStore.ts
│   ├── lib/
│   │   ├── paths.ts           # OS-specific path helpers
│   │   ├── validators.ts
│   │   └── anthropic.ts
│   ├── types/
│   │   └── config.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## Example Code Snippets

### Path Resolution (TypeScript)
```typescript
import { platform, homedir } from 'os';
import { join } from 'path';

interface ConfigPaths {
  enterprise: {
    claudeMd: string;
    settings: string;
  };
  user: {
    claudeMd: string;
    settings: string;
    settingsLocal: string;
    agents: string;
    commands: string;
  };
}

function getConfigPaths(): ConfigPaths {
  const home = homedir();
  const os = platform();
  
  let enterpriseBase: string;
  if (os === 'win32') {
    enterpriseBase = 'C:\\Program Files\\ClaudeCode';
  } else if (os === 'darwin') {
    enterpriseBase = '/Library/Application Support/ClaudeCode';
  } else {
    enterpriseBase = '/etc/claude-code';
  }
  
  return {
    enterprise: {
      claudeMd: join(enterpriseBase, 'CLAUDE.md'),
      settings: join(enterpriseBase, 'settings.json'),
    },
    user: {
      claudeMd: join(home, '.claude', 'CLAUDE.md'),
      settings: join(home, '.claude', 'settings.json'),
      settingsLocal: join(home, '.claude', 'settings.local.json'),
      agents: join(home, '.claude', 'agents'),
      commands: join(home, '.claude', 'commands'),
    },
  };
}
```

### Anthropic Chat Integration
```typescript
import Anthropic from '@anthropic-ai/sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ConfigAssistant {
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;
  
  constructor(apiKey: string, model = 'claude-sonnet-4-5-20250929') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.systemPrompt = `You are an expert assistant for Claude Code configuration.
You have access to the user's current configuration state and can help them:
- Understand their configuration hierarchy
- Debug issues with Claude Code
- Create and modify configuration files
- Set up MCP servers, custom commands, and hooks
- Search for solutions to common problems

Current configuration context will be provided with each message.`;
  }
  
  async chat(
    messages: ChatMessage[],
    configContext: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: `${this.systemPrompt}\n\nCurrent Configuration State:\n${configContext}`,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });
    
    return response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
  }
}
```

---

## Testing Requirements

### Unit Tests
- Path resolution for each OS
- JSON schema validation
- Permission pattern parsing
- Markdown import resolution

### Integration Tests
- File system operations
- Anthropic API calls (mocked)
- SQLite database operations

### E2E Tests
- Full scan workflow
- Edit and save configuration
- AI chat conversation

---

## Documentation

Include in-app:
- Onboarding tour for first-time users
- Contextual help tooltips
- Link to official Claude Code docs
- Searchable command reference

---

## Success Criteria

1. **Auto-Discovery**: Correctly detects 100% of existing Claude Code configurations
2. **Validation**: Catches common configuration errors before they cause issues
3. **AI Assistance**: Resolves 80%+ of user questions without external search
4. **Performance**: Scans typical system in < 5 seconds
5. **Stability**: No data loss, atomic file operations with backups
6. **Cross-Platform**: Works identically on Windows, macOS, and Linux

---

## Begin Implementation

Start with Phase 1:
1. Initialize Tauri project with React + TypeScript template
2. Implement OS detection and path resolution
3. Create file system scanner for configuration discovery
4. Build basic tree view component
5. Add simple file viewer/editor

Ask clarifying questions if any requirements are unclear. Prioritize working software over perfect architecture - we can refactor as we learn.
