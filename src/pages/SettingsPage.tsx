import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeSection, setActiveSection] = useState('account');

  const sections = [
    { key: 'account', label: 'Tài khoản', icon: User },
    { key: 'notifications', label: 'Thông báo', icon: Bell },
    { key: 'security', label: 'Bảo mật', icon: Shield },
    { key: 'system', label: 'Hệ thống', icon: Database },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Cài đặt" subtitle="Quản lý cấu hình hệ thống" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="card p-2">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === s.key ? 'bg-rose-50 text-rose-600' : 'text-charcoal-500 hover:bg-charcoal-50'}`}>
                <Icon className="w-4 h-4" /> {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <div className="card p-6">
            {activeSection === 'account' && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-charcoal-800 mb-4">Thông tin tài khoản</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-mauve-100 flex items-center justify-center text-mauve-600 text-2xl font-serif font-medium">
                    {profile?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">{profile?.full_name}</p>
                    <p className="text-sm text-charcoal-400">{profile ? ROLE_LABELS[profile.role] : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Tên đăng nhập</label>
                    <input className="input-field" value={profile?.username ?? ''} disabled />
                  </div>
                  <div>
                    <label className="label-field">Vai trò</label>
                    <input className="input-field" value={profile ? ROLE_LABELS[profile.role] : ''} disabled />
                  </div>
                </div>
                <p className="text-xs text-charcoal-400 mt-2">Liên hệ quản lý để thay đổi thông tin tài khoản.</p>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-charcoal-800 mb-4">Cài đặt thông báo</h3>
                {[
                  { label: 'Nhắc lịch hẹn qua tin nhắn', desc: 'Tự động nhắc khách trước lịch hẹn' },
                  { label: 'Cảnh báo sản phẩm sắp hết', desc: 'Thông báo khi tồn kho dưới 10' },
                  { label: 'Báo cáo doanh thu hàng ngày', desc: 'Gửi báo cáo vào cuối ngày' },
                ].map((n) => (
                  <label key={n.label} className="flex items-center justify-between p-3 bg-ivory rounded-lg cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-charcoal-700">{n.label}</p>
                      <p className="text-xs text-charcoal-400">{n.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded border-charcoal-300 text-rose-500 focus:ring-rose-300" />
                  </label>
                ))}
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-charcoal-800 mb-4">Bảo mật</h3>
                <div>
                  <label className="label-field">Mật khẩu hiện tại</label>
                  <input type="password" className="input-field" placeholder="Nhập mật khẩu hiện tại" />
                </div>
                <div>
                  <label className="label-field">Mật khẩu mới</label>
                  <input type="password" className="input-field" placeholder="Nhập mật khẩu mới" />
                </div>
                <div>
                  <label className="label-field">Xác nhận mật khẩu mới</label>
                  <input type="password" className="input-field" placeholder="Nhập lại mật khẩu mới" />
                </div>
                <button className="btn-primary">Đổi mật khẩu</button>
              </div>
            )}

            {activeSection === 'system' && (
              <div className="space-y-4">
                <h3 className="font-serif text-lg text-charcoal-800 mb-4">Thông tin hệ thống</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-3 bg-ivory rounded-lg">
                    <span className="text-charcoal-500">Phiên bản hệ thống</span>
                    <span className="font-medium text-charcoal-700">v1.0.0</span>
                  </div>
                  <div className="flex justify-between p-3 bg-ivory rounded-lg">
                    <span className="text-charcoal-500">Cơ sở dữ liệu</span>
                    <span className="font-medium text-charcoal-700">PostgreSQL (Supabase)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-ivory rounded-lg">
                    <span className="text-charcoal-500">Trợ lý AI</span>
                    <span className="font-medium text-charcoal-700">Đã kích hoạt</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
