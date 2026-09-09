import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Sparkles, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/EmptyState';

const CHART_COLORS = ['#E04F52', '#A86F7E', '#D9A93F', '#8C8278', '#C08E9B', '#6F665E'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [serviceUsage, setServiceUsage] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [employeePerf, setEmployeePerf] = useState<{ name: string; appointments: number; revenue: number }[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalAppointments: 0, totalCustomers: 0, completedAppointments: 0 });

  useEffect(() => {
    (async () => {
      const [invRes, aptRes, custRes, empRes] = await Promise.all([
        supabase.from('invoices').select('total_amount, paid_amount, created_at'),
        supabase.from('appointments').select('id, status, therapist_id, appointment_date'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id, full_name'),
      ]);

      const invoices = invRes.data ?? [];
      const appointments = aptRes.data ?? [];
      const employees = empRes.data ?? [];

      // Revenue by month (last 12)
      const months: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const ym = d.toISOString().substring(0, 7);
        const rev = invoices.filter((inv) => inv.created_at.startsWith(ym)).reduce((s, inv) => s + inv.paid_amount, 0);
        months.push({ month: d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }), revenue: rev });
      }
      setRevenueByMonth(months);

      // Service usage
      const { data: aptDetails } = await supabase.from('appointment_details').select('service:services(name, price)');
      const svcMap: Record<string, { count: number; revenue: number }> = {};
      (aptDetails ?? []).forEach((d: unknown) => {
        const item = d as { service: { name: string; price: number } | null };
        if (item.service?.name) {
          if (!svcMap[item.service.name]) svcMap[item.service.name] = { count: 0, revenue: 0 };
          svcMap[item.service.name].count++;
          svcMap[item.service.name].revenue += item.service.price;
        }
      });
      setServiceUsage(Object.entries(svcMap).map(([name, v]) => ({ name, count: v.count, revenue: v.revenue })).sort((a, b) => b.count - a.count));

      // Employee performance
      const empMap: Record<string, { appointments: number }> = {};
      appointments.forEach((a) => { if (a.therapist_id) empMap[a.therapist_id] = { appointments: (empMap[a.therapist_id]?.appointments ?? 0) + 1 }; });
      const empPerf = employees.map((e) => ({ name: e.full_name, appointments: empMap[e.id]?.appointments ?? 0, revenue: 0 }));
      // Calculate revenue per employee from invoices linked to appointments
      const { data: invWithApt } = await supabase.from('invoices').select('paid_amount, appointment:appointments(therapist_id)');
      (invWithApt ?? []).forEach((inv: unknown) => {
        const item = inv as { paid_amount: number; appointment: { therapist_id: string } | null };
        if (item.appointment?.therapist_id) {
          const emp = empPerf.find((e) => e.name === employees.find((em) => em.id === item.appointment?.therapist_id)?.full_name);
          if (emp) emp.revenue += item.paid_amount;
        }
      });
      setEmployeePerf(empPerf.sort((a, b) => b.appointments - a.appointments));

      setSummary({
        totalRevenue: invoices.reduce((s, i) => s + i.paid_amount, 0),
        totalAppointments: appointments.length,
        totalCustomers: custRes.count ?? 0,
        completedAppointments: appointments.filter((a) => a.status === 'completed').length,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6"><LoadingState /></div>;

  const cards = [
    { label: 'Tổng doanh thu', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Tổng lịch hẹn', value: summary.totalAppointments.toString(), icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Khách hàng', value: summary.totalCustomers.toString(), icon: Users, color: 'text-mauve-500', bg: 'bg-mauve-50' },
    { label: 'Lịch đã hoàn thành', value: summary.completedAppointments.toString(), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Báo cáo" subtitle="Thống kê doanh thu và hiệu suất" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <p className="text-sm text-charcoal-400 mb-1">{c.label}</p>
              <p className="text-xl font-semibold text-charcoal-800">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg text-charcoal-800 mb-4">Doanh thu theo tháng (12 tháng)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C8278' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8C8278' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
            <Line type="monotone" dataKey="revenue" stroke="#E04F52" strokeWidth={2} dot={{ fill: '#E04F52', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Dịch vụ theo số lần sử dụng</h3>
          {serviceUsage.length === 0 ? (
            <p className="text-sm text-charcoal-400 text-center py-12">Chưa có dữ liệu.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#8C8278' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#8C8278' }} width={120} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
                <Bar dataKey="count" fill="#A86F7E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Hiệu suất nhân viên</h3>
          {employeePerf.length === 0 ? (
            <p className="text-sm text-charcoal-400 text-center py-12">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-3">
              {employeePerf.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-mauve-100 flex items-center justify-center text-mauve-600 text-sm font-medium">{e.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal-700 font-medium">{e.name}</span>
                      <span className="text-charcoal-500">{e.appointments} lịch • {formatCurrency(e.revenue)}</span>
                    </div>
                    <div className="h-2 bg-charcoal-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(100, (e.appointments / Math.max(...employeePerf.map((x) => x.appointments), 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg text-charcoal-800 mb-4">Tỷ lệ doanh thu theo dịch vụ</h3>
        {serviceUsage.length === 0 ? (
          <p className="text-sm text-charcoal-400 text-center py-12">Chưa có dữ liệu.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={serviceUsage} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry: { name?: string }) => entry.name ?? ''}>
                {serviceUsage.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
