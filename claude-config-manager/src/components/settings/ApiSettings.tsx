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
    const { apiKey, setApiKey } = useConfigStore();
    const [tempKey, setTempKey] = useState(apiKey || '');
    const [isValidating, setIsValidating] = useState(false);
    const { toast } = useToast();

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
            toast({
                title: "API Key Validated",
                description: "Your Anthropic API key has been saved successfully.",
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
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Stored locally in your browser/app data.
                        </p>
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
