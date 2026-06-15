import CompanySelectionPage from "./pages/CompanySelectionPage";
import AppRouter from "./routes/AppRouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


const queryClient = new QueryClient();

export default function App() {
  const selectedCompany = localStorage.getItem("selectedCompany");

  return (
    <QueryClientProvider client={queryClient}>
      {!selectedCompany ? <CompanySelectionPage /> : <AppRouter />}
    </QueryClientProvider>
  );
}
