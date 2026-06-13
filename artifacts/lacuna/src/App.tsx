import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { WatchlistProvider } from "@/lib/data/WatchlistContext";
import { VerifiedDatasetProvider } from "@/lib/data/VerifiedDatasetContext";
import AppShell from "@/components/layout/AppShell";
import LegacyHashRedirect from "@/components/layout/LegacyHashRedirect";
import { getStaticVerifiedDataset } from "@/lib/data/staticDataset";
import HubPage from "@/app/sections/HubPage";
import DealsPage from "@/app/sections/DealsPage";
import IntelligencePage from "@/app/sections/IntelligencePage";
import ResearchPage from "@/app/sections/ResearchPage";
import MethodsPage from "@/app/sections/MethodsPage";

const queryClient = new QueryClient();
const dataset = getStaticVerifiedDataset();

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-lacuna-plum">404 — Page not found</h1>
        <p className="mt-2 text-lacuna-blue">
          <a href="/" className="underline">Go home</a>
        </p>
      </div>
    </div>
  );
}

function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <VerifiedDatasetProvider dataset={dataset}>
      <LegacyHashRedirect />
      <AppShell>{children}</AppShell>
    </VerifiedDatasetProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProductLayout><HubPage /></ProductLayout>
      </Route>
      <Route path="/deals">
        <ProductLayout><DealsPage /></ProductLayout>
      </Route>
      <Route path="/research">
        <ProductLayout><ResearchPage /></ProductLayout>
      </Route>
      <Route path="/methods">
        <ProductLayout><MethodsPage /></ProductLayout>
      </Route>
      <Route path="/intelligence">
        <ProductLayout><IntelligencePage /></ProductLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <WatchlistProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </WatchlistProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
