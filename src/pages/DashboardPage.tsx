import { useEffect, useState } from 'react';
import {
  DollarSign,
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/labels';
import { LoadingState } from '@/components/EmptyState';

interface DashboardData {
  todayRevenue: number;
  monthRevenue: number;
  customerCount: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  totalDebt: number;
  lowStockCount: number;
  revenueByDay: { date: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  serviceUsage: { name: string; count: number }[];
  employeePerformance: { name: string; appointments: number }[];
  appointmentTrend: { date: string; count: number }[];
}

const CHART_COLORS = ['#E04F52', '#A86F7E', '#D9A93F', '#8C8278', '#C08E9B', '#6F665E'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [invRes, custRes, aptRes, prodRes, empRes] = await Promise.all([
      supabase.from('invoices').select('total_amount, paid_amount, created_at'),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id, status, appointment_date, therapist_id'),
      supabase.from('products').select('name, stock_quantity'),
      supabase.from('employees').select('id, full_name'),
    ]);

    const invoices = invRes.data ?? [];
    const todayRevenue = invoices
      .filter((i) => i.created_at.startsWith(today))
      .reduce((sum, i) => sum + i.paid_amount, 0);
    const monthRevenue = invoices
      .filter((i) => i.created_at.startsWith(today.substring(0, 7)))
      .reduce((sum, i) => sum + i.paid_amount, 0);
    const totalDebt = invoices.reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0);

    const appointments = aptRes.data ?? [];
    const todayAppointments = appointments.filter((a) => a.appointment_date === today).length;
    const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
    const completedAppointments = appointments.filter((a) => a.status === 'completed').length;

    const products = prodRes.data ?? [];
    const lowStockCount = products.filter((p) => p.stock_quantity <= 10).length;

    // Revenue by day (last 7 days)
    const last7Days: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const rev = invoices.filter((inv) => inv.created_at.startsWith(ds)).reduce((s, inv) => s + inv.paid_amount, 0);
      last7Days.push({ date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), revenue: rev });
    }

    // Revenue by month (last 6 months)
    const last6Months: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = d.toISOString().substring(0, 7);
      const rev = invoices.filter((inv) => inv.created_at.startsWith(ym)).reduce((s, inv) => s + inv.paid_amount, 0);
      last6Months.push({ month: d.toLocaleDateString('vi-VN', { month: 'short' }), revenue: rev });
    }

    // Service usage from appointment_details
    const { data: aptDetails } = await supabase
      .from('appointment_details')
      .select('service:services(name)');
    const svcCount: Record<string, number> = {};
    (aptDetails ?? []).forEach((d: unknown) => {
      const item = d as { service: { name: string } | null };
      if (item.service?.name) svcCount[item.service.name] = (svcCount[item.service.name] ?? 0) + 1;
    });
    const serviceUsage = Object.entries(svcCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Employee performance
    const empMap: Record<string, number> = {};
    appointments.forEach((a) => {
      if (a.therapist_id) empMap[a.therapist_id] = (empMap[a.therapist_id] ?? 0) + 1;
    });
    const employeePerformance = (empRes.data ?? [])
      .map((e) => ({ name: e.full_name, appointments: empMap[e.id] ?? 0 }))
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5);

    // Appointment trend (last 7 days)
    const aptTrend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const cnt = appointments.filter((a) => a.appointment_date === ds).length;
      aptTrend.push({ date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), count: cnt });
    }

    setData({
      todayRevenue,
      monthRevenue,
      customerCount: custRes.count ?? 0,
      todayAppointments,
      pendingAppointments,
      completedAppointments,
      totalDebt,
      lowStockCount,
      revenueByDay: last7Days,
      revenueByMonth: last6Months,
      serviceUsage,
      employeePerformance,
      appointmentTrend: aptTrend,
    });
    setLoading(false);
  }

  if (loading || !data) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  const cards = [
    { label: 'Doanh thu hôm nay', value: formatCurrency(data.todayRevenue), icon: DollarSign, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Doanh thu tháng này', value: formatCurrency(data.monthRevenue), icon: TrendingUp, color: 'text-gold-600', bg: 'bg-gold-50' },
    { label: 'Khách hàng', value: data.customerCount.toString(), icon: Users, color: 'text-mauve-500', bg: 'bg-mauve-50' },
    { label: 'Lịch hẹn hôm nay', value: data.todayAppointments.toString(), icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Lịch đang chờ', value: data.pendingAppointments.toString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Lịch đã hoàn thành', value: data.completedAppointments.toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Công nợ', value: formatCurrency(data.totalDebt), icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Sản phẩm sắp hết', value: data.lowStockCount.toString(), icon: Boxes, color: 'text-rose-400', bg: 'bg-rose-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-charcoal-800">Tổng quan</h1>
        <p className="text-sm text-charcoal-400 mt-1">Xem nhanh tình hình hoạt động của spa</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-sm text-charcoal-400 mb-1">{card.label}</p>
              <p className="text-xl font-semibold text-charcoal-800">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by day */}
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.revenueByDay}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E04F52" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E04F52" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8C8278' }} />
              <YAxis tick={{ fontSize: 12, fill: '#8C8278' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
              <Area type="monotone" dataKey="revenue" stroke="#E04F52" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by month */}
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Doanh thu theo tháng</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8C8278' }} />
              <YAxis tick={{ fontSize: 12, fill: '#8C8278' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
              <Bar dataKey="revenue" fill="#D9A93F" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service usage */}
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Dịch vụ được sử dụng nhiều nhất</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.serviceUsage}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry: { name?: string }) => entry.name ?? ''}
                labelLine={false}
              >
                {data.serviceUsage.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Employee performance */}
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">Nhân viên có hiệu suất cao</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.employeePerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#8C8278' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#8C8278' }} width={100} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
              <Bar dataKey="appointments" fill="#A86F7E" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointment trend */}
      <div className="card p-6">
        <h3 className="font-serif text-lg text-charcoal-800 mb-4">Số lượng lịch hẹn (7 ngày gần đây)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.appointmentTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E3" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8C8278' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8C8278' }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8E6E3', fontSize: '13px' }} />
            <Bar dataKey="count" fill="#8C8278" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
