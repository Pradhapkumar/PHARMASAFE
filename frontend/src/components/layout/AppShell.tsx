import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumb from './Breadcrumb';
import DemoScenarioGuide from '../demo/DemoScenarioGuide';
import { useAuth } from '../../context/AuthContext';
import { RoleType, User } from '../../types/api';
import { MOCK_USERS } from '../../mocks/mockData';

export const AppShell: React.FC = () => {
  const { currentUser, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fallback if not logged in or during initial render
  const activeUser: User = currentUser || MOCK_USERS['manufacturer'];

  const handleRoleChange = async (newRole: RoleType) => {
    const roleKey = Object.keys(MOCK_USERS).find(
      k => MOCK_USERS[k].role === newRole
    ) || 'manufacturer';
    await switchRole(roleKey);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        currentRole={activeUser.role}
        className="hidden md:flex shrink-0"
      />

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <Sidebar
            currentRole={activeUser.role}
            className="relative w-64 h-full shadow-2xl z-10"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          currentUser={activeUser}
          onRoleChange={handleRoleChange}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumb />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Interactive Judge Demo Walkthrough Guide */}
      <DemoScenarioGuide />
    </div>
  );
};

export default AppShell;
