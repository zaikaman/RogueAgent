import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { config } from './config/wagmi';
import Home from './pages/Home';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { SignalsPage } from './pages/SignalsPage';
import { IntelPage } from './pages/IntelPage';
import { YieldFarming } from './pages/YieldFarming';
import { AirdropsPage } from './pages/AirdropsPage';
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
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#0891b2', // cyan-600
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
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
              <Route path="/app/airdrops" element={
                <DashboardLayout>
                  <AirdropsPage />
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
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
