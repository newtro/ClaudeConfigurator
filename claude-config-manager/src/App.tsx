import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { SimpleEditor } from './components/editors/SimpleEditor';
import { AIAssistant } from './components/ai/AIAssistant';
import { Toaster } from './components/ui/toaster';
import { useConfigStore } from './stores/configStore';
import { EmptyState } from './components/layout/EmptyState';

function App() {
  const { selectedFilePath, theme } = useConfigStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative border-r">
        {selectedFilePath ? (
          <SimpleEditor path={selectedFilePath} />
        ) : (
          <EmptyState />
        )}
      </main>
      <AIAssistant />
      <Toaster />
    </div>
  );
}

export default App;
