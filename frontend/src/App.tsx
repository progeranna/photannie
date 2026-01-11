import { Navigate, Route, Routes } from "react-router-dom";
import ClientPage from "./pages/ClientPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import RequireAdmin from "./components/admin/RequireAdmin";

export default function App() {
    return (
            <Routes>
                <Route path="/" element={<ClientPage />} />

                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route
                    path="/admin"
                    element={
                        <RequireAdmin>
                            <AdminPage />
                        </RequireAdmin>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
    );
}
