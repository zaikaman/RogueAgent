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
import { AskRogue } from './pages/AskRogue';
import { FuturesAgentsPage } from './pages/FuturesAgentsPage';
import { PredictionsPage } from './pages/PredictionsPage';
import Introduction from './pages/docs/Introduction';
import Quickstart from './pages/docs/Quickstart';
import Architecture from './pages/docs/Architecture';
import Agents from './pages/docs/Agents';
import Configuration from './pages/docs/Configuration';
import API from './pages/docs/API';
import Tiers from './pages/docs/Tiers';
import Telegram from './pages/docs/Telegram';
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
              <Route path="/docs" element={<Introduction />} />
              <Route path="/docs/quickstart" element={<Quickstart />} />
              <Route path="/docs/architecture" element={<Architecture />} />
              <Route path="/docs/agents" element={<Agents />} />
              <Route path="/docs/configuration" element={<Configuration />} />
              <Route path="/docs/api" element={<API />} />
              <Route path="/docs/tiers" element={<Tiers />} />
              <Route path="/docs/telegram" element={<Telegram />} />
              <Route path="/app" element={
                <DashboardLayout>
                  <DashboardHome />
                </DashboardLayout>
              } />
              <Route path="/app/ask" element={
                <DashboardLayout>
                  <AskRogue />
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
              <Route path="/app/futures" element={
                <DashboardLayout>
                  <FuturesAgentsPage />
                </DashboardLayout>
              } />
              <Route path="/app/predictions" element={
                <DashboardLayout>
                  <PredictionsPage />
                </DashboardLayout>
              } />
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
