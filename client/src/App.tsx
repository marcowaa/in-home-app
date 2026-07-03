import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SupportButton } from "@/components/SupportButton";

import NotFound from "@/pages/not-found";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminPaymentMethods from "@/pages/admin/AdminPaymentMethods";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminChangePassword from "@/pages/admin/AdminChangePassword";
import AdminDrivers from "@/pages/admin/AdminDrivers";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import AdminOperationsLog from "@/pages/admin/AdminOperationsLog";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminContracts from "@/pages/admin/AdminContracts";
import AdminDisputes from "@/pages/admin/AdminDisputes";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPayments from "@/pages/admin/AdminPayments";
import DriverLogin from "@/pages/driver/DriverLogin";
import DriverDashboard from "@/pages/driver/DriverDashboard";
import DriverWallet from "@/pages/driver/DriverWallet";

// User app pages
import UserAuth from "@/pages/app/UserAuth";
import UserRegister from "@/pages/app/UserRegister";
import AppHome from "@/pages/app/AppHome";
import AppLayout from "@/components/app/AppLayout";
import TransferFlow from "@/pages/app/TransferFlow";
import TransferHistory from "@/pages/app/TransferHistory";
import ContractList from "@/pages/app/ContractList";
import ContractCreate from "@/pages/app/ContractCreate";
import ContractDetails from "@/pages/app/ContractDetails";
import UserWallet from "@/pages/app/UserWallet";
import UserProfile from "@/pages/app/UserProfile";
import Beneficiaries from "@/pages/app/Beneficiaries";
import QRScanner from "@/pages/app/QRScanner";
import SupportTickets from "@/pages/app/SupportTickets";
import SupportTicketDetails from "@/pages/app/SupportTicketDetails";
import Marketplace from "@/pages/app/Marketplace";
import KYCVerification from "@/pages/app/KYCVerification";

// Wrapper to add layout to pages
const withLayout = (Component: React.ComponentType) => {
  return function WrappedPage() {
    return (
      <AppLayout>
        <Component />
      </AppLayout>
    );
  };
};

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/app" />
      </Route>

      {/* User App Routes */}
      <Route path="/app" component={UserAuth} />
      <Route path="/app/register" component={UserRegister} />
      <Route path="/app/home" component={withLayout(AppHome)} />
      <Route path="/app/transfer" component={withLayout(TransferFlow)} />
      <Route path="/app/transfer/history" component={withLayout(TransferHistory)} />
      <Route path="/app/contracts" component={withLayout(ContractList)} />
      <Route path="/app/contracts/create" component={withLayout(ContractCreate)} />
      <Route path="/app/marketplace" component={withLayout(Marketplace)} />
      <Route path="/app/contracts/:id" component={withLayout(ContractDetails)} />
      <Route path="/app/wallet" component={withLayout(UserWallet)} />
      <Route path="/app/profile" component={withLayout(UserProfile)} />
      <Route path="/app/beneficiaries" component={withLayout(Beneficiaries)} />
      <Route path="/app/scan" component={withLayout(QRScanner)} />
      <Route path="/app/support" component={withLayout(SupportTickets)} />
      <Route path="/app/support/:id" component={withLayout(SupportTicketDetails)} />
      <Route path="/app/kyc" component={withLayout(KYCVerification)} />

      {/* Driver Routes */}
      <Route path="/driver" component={DriverLogin} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/driver/wallet" component={DriverWallet} />

      {/* Admin Routes */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/drivers" component={AdminDrivers} />
      <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/operations-log" component={AdminOperationsLog} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/change-password" component={AdminChangePassword} />
      <Route path="/admin/contracts" component={AdminContracts} />
      <Route path="/admin/disputes" component={AdminDisputes} />
      <Route path="/admin/support" component={AdminSupport} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/payments" component={AdminPayments} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <Router />
          <SupportButton />
          <Toaster />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
