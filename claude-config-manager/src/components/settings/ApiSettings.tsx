import { useState } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { validateApiKey } from '@/lib/anthropic';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, CheckCircle2 } from 'lucide-react';

interface ApiSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApiSettings({ open, onOpenChange }: ApiSettingsProps) {
    const { apiKey, setApiKey, primaryModel, setPrimaryModel, codingModel, setCodingModel, validationModel, setValidationModel } = useConfigStore();
    const [tempKey, setTempKey] = useState(apiKey || '');
    const [models, setModels] = useState({
        primary: primaryModel,
        coding: codingModel,
        validation: validationModel
    });
    const [isValidating, setIsValidating] = useState(false);
    const { toast } = useToast();

    const modelOptions = [
        { label: "Claude 4.5 Opus (Best)", value: "claude-opus-4-5" },
        { label: "Claude 4.5 Sonnet (Balanced)", value: "claude-sonnet-4-5" },
        { label: "Claude 4.5 Haiku (Fast)", value: "claude-haiku-4-5" },
        { label: "Claude 4.1 Opus", value: "claude-opus-4-1" },
        { label: "Claude 4 Opus", value: "claude-opus-4" },
        { label: "Claude 4 Sonnet", value: "claude-sonnet-4" },
        { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
        { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-20241022" },
    ];

    const handleSave = async () => {
        if (!tempKey) {
            setApiKey('');
            onOpenChange(false);
            return;
        }

        setIsValidating(true);
        const isValid = await validateApiKey(tempKey);
        setIsValidating(false);

        if (isValid) {
            setApiKey(tempKey);
            setPrimaryModel(models.primary);
            setCodingModel(models.coding);
            setValidationModel(models.validation);
            toast({
                title: "Settings Saved",
                description: "Your API key and model preferences have been updated.",
            });
            onOpenChange(false);
        } else {
            toast({
                title: "Invalid API Key",
                description: "Could not validate the API key. Please check and try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        AI Settings
                    </DialogTitle>
                    <DialogDescription>
                        Enter your Anthropic API key to enable AI-powered features like configuration health checks and intelligent generation.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="apiKey">Anthropic API Key</Label>
                        <div className="relative">
                            <Input
                                id="apiKey"
                                type="password"
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className="pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {apiKey === tempKey && tempKey !== '' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : tempKey !== '' && tempKey !== apiKey ? (
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                ) : null}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                Stored locally in your browser/app data.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 pt-2 border-t mt-2">
                        <div className="grid gap-2">
                            <Label htmlFor="primaryModel">Primary Chat Model</Label>
                            <select
                                id="primaryModel"
                                value={models.primary}
                                onChange={(e) => setModels({ ...models, primary: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {modelOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="codingModel">Coding/Generation Model</Label>
                            <select
                                id="codingModel"
                                value={models.coding}
                                onChange={(e) => setModels({ ...models, coding: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {modelOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isValidating}>
                        {isValidating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Validate & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
