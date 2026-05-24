import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import '@/i18n';

import LoginPage from "./pages/LoginPage";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import MaterialCommandsPage from "./pages/MaterialCommandsPage";
import PurchaseCommandsPage from "./pages/PurchaseCommandsPage";
import PaymentCommandsPage from "./pages/PaymentCommandsPage";
import ProjectExpensesPage from "./pages/ProjectExpensesPage";
import CreateExpensePage from "./pages/CreateExpensePage";
import StorageManagementPage from "./pages/StorageManagementPage";
import StorageDashboardPage from "./pages/StorageDashboardPage";
import StoragesPage from "./pages/StoragesPage";
import CommandsManagementPage from "./pages/CommandsManagementPage";
import SupplierManagementPage from "./pages/SupplierManagementPage";
import ReclamationMessagesPage from "./pages/ReclamationMessagesPage";
import ReceiveProductsPage from "./pages/ReceiveProductsPage";
import SettingsPage from "./pages/SettingsPage";
import ProjectsManagementPage from "./pages/ProjectsManagementPage";
import GeneralCaisseProjectPage from "./pages/GeneralCaisseProjectPage";
import ProjectsFinancingPage from "./pages/ProjectsFinancingPage";
import ComptableDebtManagementPage from "./pages/ComptableDebtManagementPage";
import WorkersManagementPage from "./pages/WorkersManagementPage";
import WorkersExpensesPage from "./pages/WorkersExpensesPage";
import EnterpriseExpensesPage from "./pages/EnterpriseExpensesPage";
import DebtsPage from "./pages/DebtsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import BonsCommandesPage from "./pages/BonsCommandesPage";
import BonsSortirPage from "./pages/BonsSortirPage";
import BudgetPage from "./pages/BudgetPage";
import ReceiveCommandsPage from "./pages/ReceiveCommandsPage";
import FinanceProjectBoxPage from "./pages/FinanceProjectBoxPage";
import PrintCustomizationPage from "./pages/PrintCustomizationPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import CreateProductPage from "./pages/CreateProductPage";
import EntrepriseSettingsPage from "./pages/EntrepriseSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Routes future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={user.role === 'storage' ? <StorageDashboardPage /> : <DashboardPage />} />
        <Route path="/material-commands" element={<MaterialCommandsPage />} />
        <Route path="/purchase-commands" element={<PurchaseCommandsPage />} />
        <Route path="/receive-commands" element={<ReceiveCommandsPage />} />
        <Route path="/finance-box" element={<FinanceProjectBoxPage />} />
        <Route path="/project-expenses" element={<ProjectExpensesPage />} />
        <Route path="/create-expense" element={<CreateExpensePage />} />
        <Route path="/customize-print" element={<PrintCustomizationPage />} />
        <Route path="/storages" element={<StoragesPage />} />
        <Route path="/storage-management" element={<StorageManagementPage />} />
        <Route path="/supplier-management" element={<SupplierManagementPage />} />
        <Route path="/commands-management" element={<CommandsManagementPage />} />
        <Route path="/reclamation-messages" element={<ReclamationMessagesPage />} />
        <Route path="/receive-products" element={<ReceiveProductsPage />} />
        <Route path="/create-product" element={<CreateProductPage />} />
        <Route path="/bons-commandes" element={<BonsCommandesPage />} />
        <Route path="/bons-sortir" element={<BonsSortirPage />} />
        <Route path="/project-finance" element={<FinanceProjectBoxPage />} />
        <Route path="/payment-commands" element={<PaymentCommandsPage />} />
        <Route path="/create-payment" element={<PaymentCommandsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/projects-management" element={<ProjectsManagementPage />} />
        <Route path="/general-caisse" element={<GeneralCaisseProjectPage />} />
        <Route path="/projects-financing" element={<ProjectsFinancingPage />} />
        <Route path="/workers-management" element={<WorkersManagementPage />} />
        <Route path="/workers-expenses" element={<WorkersExpensesPage />} />
        <Route path="/enterprise-expenses" element={<EnterpriseExpensesPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/debt-management" element={<ComptableDebtManagementPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/entreprise-settings" element={<EntrepriseSettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
