import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContractsList from './pages/contracts/ContractsList';
import ContractForm from './pages/contracts/ContractForm';
import ContractDetail from './pages/contracts/ContractDetail';
import ExpensesList from './pages/expenses/ExpensesList';
import ExpenseForm from './pages/expenses/ExpenseForm';
import ExpenseDetail from './pages/expenses/ExpenseDetail';
import AssetsList from './pages/assets/AssetsList';
import AssetForm from './pages/assets/AssetForm';
import AssetDetail from './pages/assets/AssetDetail';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<ContractsList />} />
        <Route path="contracts/new" element={<ContractForm />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="expenses" element={<ExpensesList />} />
        <Route path="expenses/new" element={<ExpenseForm />} />
        <Route path="expenses/:id" element={<ExpenseDetail />} />
        <Route path="assets" element={<AssetsList />} />
        <Route path="assets/new" element={<AssetForm />} />
        <Route path="assets/:id" element={<AssetDetail />} />
      </Route>
    </Routes>
  );
}
