/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './Landing';
import DashboardLayout from './DashboardLayout';
import OwnerDashboard from './OwnerDashboard';
import AdminDashboard from './AdminDashboard';
import { WelcomeScreen } from './components/WelcomeScreen';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <>
      <WelcomeScreen onComplete={() => setShowWelcome(false)} />
      {!showWelcome && (
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<OwnerDashboard />} />
              </Route>
              <Route path="/admin-portal" element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      )}
    </>
  );
}
