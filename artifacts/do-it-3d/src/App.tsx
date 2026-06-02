import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy } from "react";
import Lobby from "@/pages/Lobby";

const GameScene = lazy(() => import("@/scenes/GameScene"));

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl">🎲</span>
        </div>
        <div className="font-['Orbitron'] text-sm font-bold text-white animate-pulse">Loading…</div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Lobby} />
      <Route path="/game/:code">
        {(params) => (
          <Suspense fallback={<LoadingScreen />}>
            <GameScene />
          </Suspense>
        )}
      </Route>
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center glass rounded-2xl p-8">
            <div className="text-4xl mb-3">404</div>
            <div className="text-white font-bold">Halaman tidak ditemukan</div>
            <a href="/" className="mt-4 inline-block text-primary text-sm">← Kembali ke Lobby</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
