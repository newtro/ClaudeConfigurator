import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MonacoEditor } from './MonacoEditor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus, Trash2, Server, Settings2, ExternalLink,
    Pencil, Plug, AlertTriangle, CheckCircle2, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Popular MCP servers catalog
// Sources: https://github.com/modelcontextprotocol/servers
//          https://github.com/wong2/awesome-mcp-servers
export const MCP_SERVER_CATALOG = [
    {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Secure file operations with configurable access controls',
        package: '@modelcontextprotocol/server-filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir'],
        category: 'Official',
        requiresConfig: true,
        configHint: 'Replace /path/to/allowed/dir with your directory path',
    },
    {
        id: 'github',
        name: 'GitHub',
        description: 'Repository management, file operations, and GitHub API integration',
        package: '@modelcontextprotocol/server-github',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
        category: 'Official',
        requiresConfig: true,
        configHint: 'Requires GITHUB_PERSONAL_ACCESS_TOKEN environment variable',
    },
    {
        id: 'git',
        name: 'Git',
        description: 'Tools to read, search, and manipulate Git repositories',
        package: '@modelcontextprotocol/server-git',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git'],
        category: 'Official',
    },
    {
        id: 'fetch',
        name: 'Fetch',
        description: 'Web content fetching and conversion for efficient LLM usage',
        package: '@modelcontextprotocol/server-fetch',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch'],
        category: 'Official',
    },
    {
        id: 'memory',
        name: 'Memory',
        description: 'Knowledge graph-based persistent memory system',
        package: '@modelcontextprotocol/server-memory',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        category: 'Official',
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Read-only database access with schema inspection',
        package: '@modelcontextprotocol/server-postgres',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
        category: 'Official',
        requiresConfig: true,
        configHint: 'Replace connection string with your PostgreSQL URL',
    },
    {
        id: 'sqlite',
        name: 'SQLite',
        description: 'Database interaction and business intelligence capabilities',
        package: '@modelcontextprotocol/server-sqlite',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', '/path/to/database.db'],
        category: 'Official',
        requiresConfig: true,
        configHint: 'Replace with path to your SQLite database',
    },
    {
        id: 'sequential-thinking',
        name: 'Sequential Thinking',
        description: 'Dynamic problem-solving through thought sequences',
        package: '@modelcontextprotocol/server-sequential-thinking',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        category: 'Official',
    },
    {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation and web scraping',
        package: '@modelcontextprotocol/server-puppeteer',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-puppeteer'],
        category: 'Official',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Channel management and messaging capabilities',
        package: '@modelcontextprotocol/server-slack',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        env: { SLACK_BOT_TOKEN: '', SLACK_TEAM_ID: '' },
        category: 'Official',
        requiresConfig: true,
        configHint: 'Requires SLACK_BOT_TOKEN and SLACK_TEAM_ID',
    },
    {
        id: 'brave-search',
        name: 'Brave Search',
        description: 'Web and local search using Brave Search API',
        package: '@modelcontextprotocol/server-brave-search',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        env: { BRAVE_API_KEY: '' },
        category: 'Official',
        requiresConfig: true,
        configHint: 'Requires BRAVE_API_KEY environment variable',
    },
    {
        id: 'context7',
        name: 'Context7',
        description: 'Up-to-date documentation for any library',
        package: '@anthropic/mcp-server-context7',
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-context7'],
        category: 'Anthropic',
    },
];

interface MCPServer {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    type?: string;
}

interface MCPConfig {
    mcpServers?: Record<string, MCPServer>;
}

interface MCPServerEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    view?: 'form' | 'json';
}

export function MCPServerEditor({ value, onChange, view = 'form' }: MCPServerEditorProps) {
    const [config, setConfig] = useState<MCPConfig>({ mcpServers: {} });
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingServer, setEditingServer] = useState<string | null>(null);
    const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');

    // Form state for adding/editing
    const [serverForm, setServerForm] = useState({
        name: '',
        command: 'npx',
        args: '',
        env: '',
    });

    useEffect(() => {
        try {
            const parsed = JSON.parse(value || '{}');
            setConfig(parsed);
        } catch {
            setConfig({ mcpServers: {} });
        }
    }, [value]);

    const updateConfig = (newConfig: MCPConfig) => {
        setConfig(newConfig);
        onChange(JSON.stringify(newConfig, null, 2));
    };

    const servers = Object.entries(config.mcpServers || {});

    const addServerFromCatalog = (catalogServer: typeof MCP_SERVER_CATALOG[0]) => {
        const newServers = { ...config.mcpServers };
        const serverConfig: MCPServer = {
            command: catalogServer.command,
            args: [...catalogServer.args],
        };
        if (catalogServer.env) {
            // Copy env and ensure all values are strings
            serverConfig.env = Object.fromEntries(
                Object.entries(catalogServer.env).map(([k, v]) => [k, v ?? ''])
            );
        }
        newServers[catalogServer.id] = serverConfig;
        updateConfig({ ...config, mcpServers: newServers });
        setShowAddDialog(false);
    };

    const addCustomServer = () => {
        if (!serverForm.name || !serverForm.command) return;

        const newServers = { ...config.mcpServers };
        const serverConfig: MCPServer = {
            command: serverForm.command,
        };

        if (serverForm.args.trim()) {
            serverConfig.args = serverForm.args.split('\n').map(a => a.trim()).filter(Boolean);
        }

        if (serverForm.env.trim()) {
            try {
                serverConfig.env = JSON.parse(serverForm.env);
            } catch {
                // Parse as key=value lines
                const envObj: Record<string, string> = {};
                serverForm.env.split('\n').forEach(line => {
                    const [key, ...rest] = line.split('=');
                    if (key && rest.length) {
                        envObj[key.trim()] = rest.join('=').trim();
                    }
                });
                if (Object.keys(envObj).length) {
                    serverConfig.env = envObj;
                }
            }
        }

        newServers[serverForm.name] = serverConfig;
        updateConfig({ ...config, mcpServers: newServers });
        setServerForm({ name: '', command: 'npx', args: '', env: '' });
        setShowAddDialog(false);
    };

    const editServer = (name: string) => {
        const server = config.mcpServers?.[name];
        if (!server) return;

        setServerForm({
            name,
            command: server.command,
            args: server.args?.join('\n') || '',
            env: server.env ? JSON.stringify(server.env, null, 2) : '',
        });
        setEditingServer(name);
        setShowEditDialog(true);
    };

    const saveEditedServer = () => {
        if (!editingServer || !serverForm.command) return;

        const newServers = { ...config.mcpServers };

        // Remove old key if name changed
        if (editingServer !== serverForm.name) {
            delete newServers[editingServer];
        }

        const serverConfig: MCPServer = {
            command: serverForm.command,
        };

        if (serverForm.args.trim()) {
            serverConfig.args = serverForm.args.split('\n').map(a => a.trim()).filter(Boolean);
        }

        if (serverForm.env.trim()) {
            try {
                serverConfig.env = JSON.parse(serverForm.env);
            } catch {
                const envObj: Record<string, string> = {};
                serverForm.env.split('\n').forEach(line => {
                    const [key, ...rest] = line.split('=');
                    if (key && rest.length) {
                        envObj[key.trim()] = rest.join('=').trim();
                    }
                });
                if (Object.keys(envObj).length) {
                    serverConfig.env = envObj;
                }
            }
        }

        newServers[serverForm.name] = serverConfig;
        updateConfig({ ...config, mcpServers: newServers });
        setShowEditDialog(false);
        setEditingServer(null);
        setServerForm({ name: '', command: 'npx', args: '', env: '' });
    };

    const deleteServer = (name: string) => {
        const newServers = { ...config.mcpServers };
        delete newServers[name];
        updateConfig({ ...config, mcpServers: newServers });
    };

    // Check if a catalog server is already added
    const isServerAdded = (id: string) => {
        return config.mcpServers && id in config.mcpServers;
    };

    if (view === 'json') {
        return (
            <div className="h-full">
                <MonacoEditor
                    language="json"
                    value={value}
                    onChange={onChange}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Plug className="w-5 h-5 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold">MCP Servers</h2>
                                <p className="text-xs text-muted-foreground">
                                    Connect Claude to external tools and data sources
                                </p>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            Add Server
                        </Button>
                    </div>

                    {/* Server List */}
                    {servers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                            <Server className="w-12 h-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-sm font-medium mb-1">No MCP Servers Configured</h3>
                            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                                Add MCP servers to extend Claude's capabilities with external tools, databases, and APIs.
                            </p>
                            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1.5">
                                <Plus className="w-4 h-4" />
                                Add Your First Server
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {servers.map(([name, server]) => {
                                const catalogEntry = MCP_SERVER_CATALOG.find(s => s.id === name);
                                return (
                                    <div
                                        key={name}
                                        className="group border rounded-lg p-4 bg-card hover:bg-accent/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Server className="w-4 h-4 text-primary shrink-0" />
                                                    <h4 className="font-medium text-sm">{name}</h4>
                                                    {catalogEntry && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                                            {catalogEntry.category}
                                                        </span>
                                                    )}
                                                </div>
                                                {catalogEntry && (
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {catalogEntry.description}
                                                    </p>
                                                )}
                                                <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                                    {server.command} {server.args?.join(' ')}
                                                </div>
                                                {server.env && Object.keys(server.env).length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {Object.entries(server.env).map(([key, val]) => (
                                                            <span
                                                                key={key}
                                                                className={cn(
                                                                    "text-[10px] px-1.5 py-0.5 rounded",
                                                                    val ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
                                                                )}
                                                            >
                                                                {key}{!val && ' (not set)'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => editServer(name)}
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteServer(name)}
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="p-4 bg-muted/20 border rounded-lg flex gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                            <p>
                                <strong>Restart required:</strong> After modifying MCP servers, restart Claude Code for changes to take effect.
                            </p>
                            <p>
                                Learn more about MCP at{' '}
                                <a
                                    href="https://modelcontextprotocol.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                    modelcontextprotocol.io
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Server Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add MCP Server</DialogTitle>
                        <DialogDescription>
                            Choose from popular servers or add a custom configuration
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={addMode === 'catalog' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAddMode('catalog')}
                            className="flex-1 gap-1.5"
                        >
                            <Package className="w-3 h-3" />
                            Server Catalog
                        </Button>
                        <Button
                            variant={addMode === 'custom' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAddMode('custom')}
                            className="flex-1 gap-1.5"
                        >
                            <Settings2 className="w-3 h-3" />
                            Custom Server
                        </Button>
                    </div>

                    {addMode === 'catalog' ? (
                        <div className="flex-1 overflow-y-auto -mx-6 px-6">
                            <div className="grid gap-2 pb-4">
                                {MCP_SERVER_CATALOG.map((server) => {
                                    const added = isServerAdded(server.id);
                                    return (
                                        <button
                                            key={server.id}
                                            onClick={() => !added && addServerFromCatalog(server)}
                                            disabled={added}
                                            className={cn(
                                                "w-full text-left p-3 rounded-lg border transition-colors",
                                                added
                                                    ? "bg-muted/50 opacity-60 cursor-not-allowed"
                                                    : "hover:bg-accent/50 cursor-pointer"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-medium text-sm">{server.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                                            {server.category}
                                                        </span>
                                                        {server.requiresConfig && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">
                                                                Config required
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {server.description}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                                                        {server.package}
                                                    </p>
                                                </div>
                                                {added ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                                ) : (
                                                    <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="serverName">Server Name *</Label>
                                <Input
                                    id="serverName"
                                    placeholder="my-server"
                                    value={serverForm.name}
                                    onChange={(e) => setServerForm(prev => ({
                                        ...prev,
                                        name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                    }))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="command">Command *</Label>
                                <Select
                                    value={serverForm.command}
                                    onValueChange={(v) => setServerForm(prev => ({ ...prev, command: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="npx">npx</SelectItem>
                                        <SelectItem value="node">node</SelectItem>
                                        <SelectItem value="python">python</SelectItem>
                                        <SelectItem value="python3">python3</SelectItem>
                                        <SelectItem value="uvx">uvx</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="args">Arguments (one per line)</Label>
                                <Textarea
                                    id="args"
                                    placeholder="-y&#10;@modelcontextprotocol/server-example"
                                    value={serverForm.args}
                                    onChange={(e) => setServerForm(prev => ({ ...prev, args: e.target.value }))}
                                    rows={3}
                                    className="font-mono text-xs"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="env">Environment Variables (JSON or KEY=VALUE per line)</Label>
                                <Textarea
                                    id="env"
                                    placeholder='{"API_KEY": "your-key"}&#10;or&#10;API_KEY=your-key'
                                    value={serverForm.env}
                                    onChange={(e) => setServerForm(prev => ({ ...prev, env: e.target.value }))}
                                    rows={3}
                                    className="font-mono text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                        </Button>
                        {addMode === 'custom' && (
                            <Button onClick={addCustomServer} disabled={!serverForm.name || !serverForm.command}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Server
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Server Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit MCP Server</DialogTitle>
                        <DialogDescription>
                            Modify the server configuration
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="editServerName">Server Name</Label>
                            <Input
                                id="editServerName"
                                value={serverForm.name}
                                onChange={(e) => setServerForm(prev => ({
                                    ...prev,
                                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="editCommand">Command</Label>
                            <Select
                                value={serverForm.command}
                                onValueChange={(v) => setServerForm(prev => ({ ...prev, command: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="npx">npx</SelectItem>
                                    <SelectItem value="node">node</SelectItem>
                                    <SelectItem value="python">python</SelectItem>
                                    <SelectItem value="python3">python3</SelectItem>
                                    <SelectItem value="uvx">uvx</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="editArgs">Arguments (one per line)</Label>
                            <Textarea
                                id="editArgs"
                                value={serverForm.args}
                                onChange={(e) => setServerForm(prev => ({ ...prev, args: e.target.value }))}
                                rows={3}
                                className="font-mono text-xs"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="editEnv">Environment Variables (JSON)</Label>
                            <Textarea
                                id="editEnv"
                                value={serverForm.env}
                                onChange={(e) => setServerForm(prev => ({ ...prev, env: e.target.value }))}
                                rows={3}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveEditedServer}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
