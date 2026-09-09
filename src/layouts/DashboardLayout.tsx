import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  Flower2,
  Package,
  Boxes,
  UserCog,
  Receipt,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/utils/labels';
import { UserRole } from '@/types';

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; roles?: UserRole[] }[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/appointments', label: 'Lịch hẹn', icon: CalendarDays },
  { to: '/services', label: 'Dịch vụ', icon: Sparkles },
  { to: '/treatments', label: 'Liệu trình', icon: Flower2 },
  { to: '/packages', label: 'Gói chăm sóc', icon: Package },
  { to: '/products', label: 'Sản phẩm', icon: Boxes },
  { to: '/employees', label: 'Nhân viên', icon: UserCog, roles: ['manager'] },
  { to: '/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/ai-assistant', label: 'AI Trợ lý', icon: Bot },
  { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return profile && item.roles.includes(profile.role);
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-charcoal-100 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-charcoal-100">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-rose-500" />
          </div>
          <span className="font-serif text-xl font-semibold text-charcoal-700">Serene Spa</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-charcoal-500 hover:bg-charcoal-50 hover:text-charcoal-700'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-charcoal-100 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-mauve-100 flex items-center justify-center text-mauve-600 font-medium text-sm">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal-700 truncate">{profile?.full_name}</p>
              <p className="text-xs text-charcoal-400">{profile ? ROLE_LABELS[profile.role] : ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Đăng xuất"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-charcoal-900/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-charcoal-100 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-charcoal-500 hover:bg-charcoal-50 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <span className="font-serif text-lg font-semibold text-charcoal-700">Serene Spa</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
