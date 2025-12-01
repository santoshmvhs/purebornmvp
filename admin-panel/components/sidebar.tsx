'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  LogOut,
  FileText,
  Warehouse,
  Factory,
  Calendar,
  Receipt,
  Building2,
  UserCircle,
  Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Sales', href: '/sales', icon: ShoppingCart },
  { name: 'Purchases', href: '/purchases', icon: Receipt },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Manufacturing', href: '/manufacturing', icon: Factory },
  { name: 'Expenses', href: '/expenses', icon: FileText },
  { name: 'Day Counter', href: '/day-counter', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'GST Reports', href: '/gst-reports', icon: FileText },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Customers', href: '/customers', icon: UserCircle },
  { name: 'Raw Materials', href: '/raw-materials', icon: Box },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, isAdmin } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin()
  );

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg md:shadow-none">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold">Pureborn</h1>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        <div className="mb-3 rounded-lg bg-sidebar-accent p-3">
          <p className="text-sm font-medium">{user?.username}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

