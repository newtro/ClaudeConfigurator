import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2, Search, Star, GitFork, Download,
    Clock, TrendingUp, Sparkles, AlertTriangle, CheckCircle2,
    Github, Package, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveConfigFile, createDirectory } from '@/lib/paths';

// Known skill collections for curated browsing
const CURATED_COLLECTIONS = [
    {
        id: 'anthropics/skills',
        name: 'Official Anthropic Skills',
        description: 'Official skills from Anthropic including document processing (Word, PDF, PowerPoint, Excel)',
        stars: 33500,
        category: 'Official',
    },
    {
        id: 'travisvn/awesome-claude-skills',
        name: 'Awesome Claude Skills',
        description: 'Curated collection of 50+ verified skills for Claude Code',
        stars: 4100,
        category: 'Community',
    },
    {
        id: 'alirezarezvani/claude-skills',
        name: 'Production-Ready Skills',
        description: '42 production-ready skills including subagents and commands',
        stars: 496,
        category: 'Community',
    },
    {
        id: 'obra/superpowers',
        name: 'Superpowers',
        description: 'Core skills library with 20+ battle-tested skills (TDD, debugging, collaboration)',
        stars: 800,
        category: 'Community',
    },
    {
        id: 'levnikolaevich/claude-code-skills',
        name: 'Agile Automation Skills',
        description: '52 production-ready Agile automation tools with Linear MCP integration',
        stars: 21,
        category: 'Specialized',
    },
];

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    topics: string[];
    owner: {
        login: string;
        avatar_url: string;
    };
}

interface SkillFile {
    name: string;
    path: string;
    download_url: string;
    type: 'file' | 'dir';
}

interface SkillBrowserProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skillsPath: string;
    onImported: () => void;
}

export function SkillBrowser({ open, onOpenChange, skillsPath, onImported }: SkillBrowserProps) {
    const [activeTab, setActiveTab] = useState<'curated' | 'search' | 'trending'>('curated');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<GitHubRepo[]>([]);
    const [trendingRepos, setTrendingRepos] = useState<GitHubRepo[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
    const [repoSkills, setRepoSkills] = useState<SkillFile[]>([]);
    const [isLoadingSkills, setIsLoadingSkills] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null);
    const [importedSkills, setImportedSkills] = useState<Set<string>>(new Set());

    const { toast } = useToast();

    // Load trending repos on mount
    useEffect(() => {
        if (open && trendingRepos.length === 0) {
            loadTrending();
        }
    }, [open]);

    const loadTrending = async () => {
        setIsSearching(true);
        try {
            // Search for repos that are specifically Claude Code skill collections
            // Use multiple targeted searches and combine results
            const searches = [
                'claude-code skills in:name',
                'claude-skills in:name',
                'claude code skill in:name,description',
                'SKILL.md claude in:readme',
            ];

            const allRepos: GitHubRepo[] = [];
            const seenIds = new Set<number>();

            for (const searchTerm of searches) {
                try {
                    const query = encodeURIComponent(searchTerm);
                    const response = await fetch(
                        `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=10`,
                        {
                            headers: {
                                'Accept': 'application/vnd.github+json',
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        for (const repo of data.items || []) {
                            if (!seenIds.has(repo.id)) {
                                seenIds.add(repo.id);
                                allRepos.push(repo);
                            }
                        }
                    }
                } catch {
                    // Continue with other searches
                }
            }

            // Sort by stars descending
            allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);

            setTrendingRepos(allRepos.slice(0, 20));
        } catch (err) {
            console.error('Failed to load trending:', err);
            toast({
                title: "Failed to load trending",
                description: "Could not fetch trending repositories from GitHub",
                variant: "destructive",
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);

        try {
            // Search for repositories with the user's query plus claude-code context
            const allRepos: GitHubRepo[] = [];
            const seenIds = new Set<number>();

            // Try multiple search patterns
            const searches = [
                `${searchQuery} claude-code skill`,
                `${searchQuery} claude skill`,
                `${searchQuery} SKILL.md`,
            ];

            for (const searchTerm of searches) {
                try {
                    const query = encodeURIComponent(searchTerm);
                    const response = await fetch(
                        `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=15`,
                        {
                            headers: {
                                'Accept': 'application/vnd.github+json',
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        for (const repo of data.items || []) {
                            if (!seenIds.has(repo.id)) {
                                seenIds.add(repo.id);
                                allRepos.push(repo);
                            }
                        }
                    }
                } catch {
                    // Continue with other searches
                }
            }

            // Sort by stars descending
            allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
            setSearchResults(allRepos.slice(0, 30));

            if (allRepos.length === 0) {
                toast({
                    title: "No results",
                    description: "No skill repositories found for your query. Try different keywords.",
                });
            }
        } catch (err) {
            console.error('Search failed:', err);
            toast({
                title: "Search failed",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsSearching(false);
        }
    };

    const loadRepoSkills = async (repo: GitHubRepo) => {
        setSelectedRepo(repo);
        setIsLoadingSkills(true);
        setRepoSkills([]);

        try {
            // First, try to find skills/ directory
            const skillsResponse = await fetch(
                `https://api.github.com/repos/${repo.full_name}/contents/skills`,
                {
                    headers: { 'Accept': 'application/vnd.github+json' }
                }
            );

            let skills: SkillFile[] = [];

            if (skillsResponse.ok) {
                const skillsDirs = await skillsResponse.json();
                // Each subdirectory in skills/ should be a skill
                skills = skillsDirs.filter((item: SkillFile) => item.type === 'dir');
            }

            // If no skills/ dir, check root for SKILL.md (single skill repo)
            if (skills.length === 0) {
                const rootResponse = await fetch(
                    `https://api.github.com/repos/${repo.full_name}/contents`,
                    {
                        headers: { 'Accept': 'application/vnd.github+json' }
                    }
                );

                if (rootResponse.ok) {
                    const rootContents = await rootResponse.json();
                    const hasSkillMd = rootContents.some((f: SkillFile) => f.name === 'SKILL.md');
                    if (hasSkillMd) {
                        skills = [{
                            name: repo.name,
                            path: '',
                            download_url: '',
                            type: 'dir'
                        }];
                    }

                    // Also check for skill directories at root (dirs containing SKILL.md)
                    const dirs = rootContents.filter((item: SkillFile) => item.type === 'dir');
                    for (const dir of dirs.slice(0, 10)) { // Limit to avoid rate limiting
                        try {
                            const dirResponse = await fetch(
                                `https://api.github.com/repos/${repo.full_name}/contents/${dir.path}`,
                                { headers: { 'Accept': 'application/vnd.github+json' } }
                            );
                            if (dirResponse.ok) {
                                const dirContents = await dirResponse.json();
                                if (dirContents.some((f: SkillFile) => f.name === 'SKILL.md')) {
                                    skills.push(dir);
                                }
                            }
                        } catch {
                            // Ignore individual directory errors
                        }
                    }
                }
            }

            setRepoSkills(skills);

            if (skills.length === 0) {
                toast({
                    title: "No skills found",
                    description: "This repository doesn't contain recognizable skill directories",
                });
            }
        } catch (err) {
            console.error('Failed to load skills:', err);
            toast({
                title: "Failed to load repository",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoadingSkills(false);
        }
    };

    const importSkill = async (repo: GitHubRepo, skillPath: string, skillName: string) => {
        const importKey = `${repo.full_name}/${skillPath || skillName}`;
        setIsImporting(importKey);

        try {
            // Determine the path to fetch from
            const basePath = skillPath || '';
            const fetchPath = basePath ? `${basePath}/SKILL.md` : 'SKILL.md';

            // Fetch SKILL.md content
            const skillMdResponse = await fetch(
                `https://api.github.com/repos/${repo.full_name}/contents/${fetchPath}`,
                { headers: { 'Accept': 'application/vnd.github+json' } }
            );

            if (!skillMdResponse.ok) {
                throw new Error('Could not find SKILL.md');
            }

            const skillMdData = await skillMdResponse.json();
            const skillContent = atob(skillMdData.content);

            // Create skill directory
            const skillDirPath = `${skillsPath}/${skillName}`;
            await createDirectory(skillDirPath);

            // Save SKILL.md
            await saveConfigFile(`${skillDirPath}/SKILL.md`, skillContent);

            // Try to fetch additional files (scripts/, references/, etc.)
            if (basePath) {
                try {
                    const dirResponse = await fetch(
                        `https://api.github.com/repos/${repo.full_name}/contents/${basePath}`,
                        { headers: { 'Accept': 'application/vnd.github+json' } }
                    );

                    if (dirResponse.ok) {
                        const dirContents = await dirResponse.json();
                        for (const file of dirContents) {
                            if (file.type === 'file' && file.name !== 'SKILL.md') {
                                try {
                                    const fileResponse = await fetch(file.download_url);
                                    const fileContent = await fileResponse.text();
                                    await saveConfigFile(`${skillDirPath}/${file.name}`, fileContent);
                                } catch {
                                    // Skip files that fail to download
                                }
                            }
                        }
                    }
                } catch {
                    // Ignore errors fetching additional files
                }
            }

            setImportedSkills(prev => new Set([...prev, importKey]));

            toast({
                title: "Skill imported",
                description: `Successfully imported "${skillName}"`,
            });

            onImported();

        } catch (err) {
            console.error('Import failed:', err);
            toast({
                title: "Import failed",
                description: (err as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsImporting(null);
        }
    };

    const formatStars = (count: number) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 1) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Github className="w-5 h-5" />
                        Find Skills on GitHub
                    </DialogTitle>
                    <DialogDescription>
                        Browse and import skills from GitHub repositories
                    </DialogDescription>
                </DialogHeader>

                {selectedRepo ? (
                    // Skill selection view
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedRepo(null);
                                    setRepoSkills([]);
                                }}
                            >
                                ← Back
                            </Button>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium truncate">{selectedRepo.full_name}</h3>
                                <p className="text-xs text-muted-foreground truncate">
                                    {selectedRepo.description}
                                </p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 -mx-6 px-6">
                            {isLoadingSkills ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : repoSkills.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No skills found in this repository
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-2 pb-4">
                                    {repoSkills.map((skill) => {
                                        const importKey = `${selectedRepo.full_name}/${skill.path || skill.name}`;
                                        const isImported = importedSkills.has(importKey);
                                        const isCurrentlyImporting = isImporting === importKey;

                                        return (
                                            <div
                                                key={skill.path || skill.name}
                                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Package className="w-4 h-4 text-primary shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{skill.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {skill.path || 'Root skill'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={isImported ? "outline" : "default"}
                                                    onClick={() => importSkill(selectedRepo, skill.path, skill.name)}
                                                    disabled={isCurrentlyImporting || isImported}
                                                    className="gap-1.5 shrink-0"
                                                >
                                                    {isCurrentlyImporting ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : isImported ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <Download className="w-3 h-3" />
                                                    )}
                                                    {isImported ? 'Imported' : 'Import'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                ) : (
                    // Browse/search view
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="curated" className="gap-1.5 text-xs">
                                    <Sparkles className="w-3 h-3" />
                                    Curated
                                </TabsTrigger>
                                <TabsTrigger value="trending" className="gap-1.5 text-xs">
                                    <TrendingUp className="w-3 h-3" />
                                    Trending
                                </TabsTrigger>
                                <TabsTrigger value="search" className="gap-1.5 text-xs">
                                    <Search className="w-3 h-3" />
                                    Search
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {activeTab === 'search' && (
                            <div className="flex gap-2 mb-4">
                                <Input
                                    placeholder="Search for skills (e.g., 'pdf processing', 'git automation')"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1"
                                />
                                <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                                    {isSearching ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        )}

                        {activeTab === 'trending' && (
                            <div className="flex justify-end mb-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={loadTrending}
                                    disabled={isSearching}
                                    className="gap-1.5 text-xs"
                                >
                                    <RefreshCw className={cn("w-3 h-3", isSearching && "animate-spin")} />
                                    Refresh
                                </Button>
                            </div>
                        )}

                        <ScrollArea className="flex-1 -mx-6 px-6">
                            {activeTab === 'curated' && (
                                <div className="grid gap-2 pb-4">
                                    {CURATED_COLLECTIONS.map((collection) => (
                                        <button
                                            key={collection.id}
                                            onClick={() => loadRepoSkills({
                                                id: 0,
                                                name: collection.id.split('/')[1],
                                                full_name: collection.id,
                                                description: collection.description,
                                                html_url: `https://github.com/${collection.id}`,
                                                stargazers_count: collection.stars,
                                                forks_count: 0,
                                                updated_at: new Date().toISOString(),
                                                topics: [],
                                                owner: {
                                                    login: collection.id.split('/')[0],
                                                    avatar_url: '',
                                                }
                                            })}
                                            className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">{collection.name}</span>
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            collection.category === 'Official'
                                                                ? "bg-primary/10 text-primary"
                                                                : collection.category === 'Community'
                                                                    ? "bg-blue-500/10 text-blue-600"
                                                                    : "bg-purple-500/10 text-purple-600"
                                                        )}>
                                                            {collection.category}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {collection.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Star className="w-3 h-3" />
                                                            {formatStars(collection.stars)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Github className="w-3 h-3" />
                                                            {collection.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'trending' && (
                                isSearching ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : trendingRepos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            No trending repositories found
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={loadTrending}
                                            className="mt-4"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 pb-4">
                                        {trendingRepos.map((repo) => (
                                            <RepoCard
                                                key={repo.id}
                                                repo={repo}
                                                onClick={() => loadRepoSkills(repo)}
                                                formatStars={formatStars}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                )
                            )}

                            {activeTab === 'search' && (
                                searchResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Search className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            {isSearching ? 'Searching...' : 'Enter a query to search for skills'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 pb-4">
                                        {searchResults.map((repo) => (
                                            <RepoCard
                                                key={repo.id}
                                                repo={repo}
                                                onClick={() => loadRepoSkills(repo)}
                                                formatStars={formatStars}
                                                formatDate={formatDate}
                                            />
                                        ))}
                                    </div>
                                )
                            )}
                        </ScrollArea>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Repo card component
function RepoCard({
    repo,
    onClick,
    formatStars,
    formatDate
}: {
    repo: GitHubRepo;
    onClick: () => void;
    formatStars: (n: number) => string;
    formatDate: (s: string) => string;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
            <div className="flex items-start gap-3">
                {repo.owner.avatar_url && (
                    <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-8 h-8 rounded-full shrink-0"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{repo.full_name}</span>
                    </div>
                    {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {repo.description}
                        </p>
                    )}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {formatStars(repo.stargazers_count)}
                        </span>
                        <span className="flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {repo.forks_count}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(repo.updated_at)}
                        </span>
                    </div>
                    {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {repo.topics.slice(0, 4).map((topic) => (
                                <span
                                    key={topic}
                                    className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}
