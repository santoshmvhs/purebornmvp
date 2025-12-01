'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Sidebar - hidden on mobile, shown as overlay when open */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

