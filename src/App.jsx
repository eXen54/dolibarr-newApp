import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StartPage from "./pages/StartPage";
import { FO_Layout, BO_Layout } from "./components/Layout";
import Login from "./pages/BackOffice/Login";
import Dashboard from "./pages/BackOffice/Dashboard";
import Import from "./pages/BackOffice/Import";
import Reset from "./pages/BackOffice/Reset";
import ThemeSettings from "./pages/BackOffice/ThemeSettings";
import Holidays from "./pages/BackOffice/Holidays";
import Salaries from "./pages/FrontOffice/Salaries";
import SalaryForm from "./pages/FrontOffice/SalaryForm";
import SalaryDetail from "./pages/FrontOffice/SalaryDetail";
import GenerateSalaries from "./pages/FrontOffice/GenerateSalaries";
import GenerateSalaries2 from "./pages/FrontOffice/GenerateSalaries2";
import EmployeeList from "./pages/FrontOffice/EmployeeList";
import EmployeeDetail from "./pages/FrontOffice/EmployeeDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page de démarrage */}
        <Route path="/" element={<StartPage />} />

        {/* FrontOffice */}
        <Route path="/fo" element={<FO_Layout />}>
          <Route index element={<Navigate to="/fo/salaires" replace />} />
          <Route path="salaires" element={<Salaries />} />
          <Route path="salaires/nouveau" element={<SalaryForm />} />
          <Route path="salaires/:id" element={<SalaryDetail />} />
          <Route path="generer" element={<GenerateSalaries />} />
          <Route path="generer2" element={<GenerateSalaries2 />} />
          <Route path="employes" element={<EmployeeList />} />
          <Route path="employes/:id" element={<EmployeeDetail />} />
        </Route>

        {/* BackOffice : /bo = page de login (publique) */}
        <Route path="/bo" element={<Login />} />

        {/* BackOffice : zone protégée sous /bo/* */}
        <Route element={<BO_Layout />}>
          <Route path="/bo/dashboard" element={<Dashboard />} />
          <Route path="/bo/import" element={<Import />} />
          <Route path="/bo/reset" element={<Reset />} />
          <Route path="/bo/theme" element={<ThemeSettings />} />
          <Route path="/bo/jours-feries" element={<Holidays />} />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
