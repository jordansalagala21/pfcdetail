// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Container } from "@mui/material";
import AdminDashboard from "./Components/AdminDashboard";
import AdminLogin from "./Components/AdminLogin";
import CustomerDetailsForm from "./Components/CustomerDetailsForm";
import QRCodeDisplay from "./Components/QRCodeDisplay";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Container maxWidth="lg">
          <Routes>
            <Route path="/" element={<QRCodeDisplay />} />
            <Route path="/customer-details" element={<CustomerDetailsForm />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* You can add more protected routes here */}
          </Routes>
        </Container>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
