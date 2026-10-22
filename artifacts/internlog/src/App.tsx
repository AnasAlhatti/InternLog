import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import DashboardPage from '@/pages/dashboard';
import EntriesPage from '@/pages/entries';
import ReportPage from '@/pages/report';
import SettingsPage from '@/pages/settings';
import { JournalProvider } from '@/components/journal-context';
import { AppShell } from '@/components/app-shell';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'Dashboard', '/entries': 'Entries', '/report': 'Weekly Report', '/settings': 'Settings' };
    document.title = `${titles[location] || 'Page not found'} · InternLog`;
    const descriptions: Record<string, string> = {
      '/': 'See your internship progress, logged hours, skills, and open blockers.',
      '/entries': 'Record, search, and review daily internship work and learning.',
      '/report': 'Prepare an editable Monday–Sunday progress report from your saved entries.',
      '/settings': 'Manage your InternLog profile and private browser-local JSON backups.',
    };
    document.querySelector('meta[name="description"]')?.setAttribute('content', descriptions[location] || 'Your browser-local internship journal.');
  }, [location]);
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/entries" component={EntriesPage} />
          <Route path="/report">{() => <ReportPage />}</Route>
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <JournalProvider>
            <Router />
          </JournalProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
