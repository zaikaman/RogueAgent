import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { config } from './config/wagmi';
import Home from './pages/Home';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { SignalsPage } from './pages/SignalsPage';
import { IntelPage } from './pages/IntelPage';
import { YieldFarming } from './pages/YieldFarming';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AnalyticsOverview } from './pages/analytics/AnalyticsOverview';
import { PerformanceAnalytics } from './pages/analytics/PerformanceAnalytics';
import { MarketAnalytics } from './pages/analytics/MarketAnalytics';
import { SignalAnalytics } from './pages/analytics/SignalAnalytics';
import { Toaster } from 'sonner';
import { CustomCursor } from './components/ui/CustomCursor';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomCursor />
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
            <Route path="/app/yield" element={
              <DashboardLayout>
                <YieldFarming />
              </DashboardLayout>
            } />
            <Route path="/app/analytics" element={
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            }>
              <Route index element={<AnalyticsOverview />} />
              <Route path="performance" element={<PerformanceAnalytics />} />
              <Route path="market" element={<MarketAnalytics />} />
              <Route path="signals" element={<SignalAnalytics />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
