import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar closeMobileMenu={() => setMobileMenuOpen(false)} />
      </div>

      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:z-30 md:flex md:w-64 md:flex-col shadow-xs">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          isMobileOpen={mobileMenuOpen}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

