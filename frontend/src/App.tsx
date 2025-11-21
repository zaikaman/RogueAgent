import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { config } from './config/wagmi';
import Home from './pages/Home';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { SignalsPage } from './pages/SignalsPage';
import { IntelPage } from './pages/IntelPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster position="top-right" theme="dark" closeButton />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/app" element={
              <DashboardLayout>
                <DashboardHome />
              </DashboardLayout>
            } />
            <Route path="/app/signals" element={
              <DashboardLayout>
                <SignalsPage />
              </DashboardLayout>
            } />
            <Route path="/app/intel" element={
              <DashboardLayout>
                <IntelPage />
              </DashboardLayout>
            } />
            <Route path="/app/intel/:id" element={
              <DashboardLayout>
                <IntelPage />
              </DashboardLayout>
            } />
            <Route path="/app/analytics" element={
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            } />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
