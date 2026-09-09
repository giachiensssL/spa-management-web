import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Gift, Calendar, Sparkles, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer, Appointment, Invoice, AIHistory, Service } from '@/types';
import { formatDate, formatCurrency, formatTime, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, GENDER_LABELS } from '@/utils/labels';
import { LoadingState } from '@/components/EmptyState';

type Tab = 'info' | 'appointments' | 'services' | 'invoices' | 'ai';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [aiHistory, setAiHistory] = useState<AIHistory[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: cust } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
    setCustomer(cust as Customer | null);

    const { data: apts } = await supabase
      .from('appointments')
      .select('*, customer:customers(*), therapist:employees(*), appointment_details(* , service:services(*))')
      .eq('customer_id', id)
      .order('appointment_date', { ascending: false });
    setAppointments(apts as Appointment[] ?? []);

    const { data: invs } = await supabase
      .from('invoices')
      .select('*, customer:customers(*), invoice_details(*)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });
    setInvoices(invs as Invoice[] ?? []);

    const { data: aiHist } = await supabase
      .from('ai_history')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });
    setAiHistory(aiHist as AIHistory[] ?? []);

    const { data: svcs } = await supabase.from('services').select('*').eq('status', 'active');
    setAllServices(svcs as Service[] ?? []);

    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load AI summary if available
  useEffect(() => {
    const existing = aiHistory.find((h) => h.ai_type === 'summary');
    if (existing) setAiSummary(existing.output_content);
  }, [aiHistory]);

  const generateSummary = async () => {
    if (!customer || !id) return;
    setAiLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'customer-summary',
          customer,
          appointments,
          invoices,
        }),
      });
      if (!response.ok) throw new Error('AI error');
      const result = await response.json();
      setAiSummary(result.summary ?? 'AI hiện không khả dụng. Vui lòng thử lại sau.');
      load();
    } catch {
      setAiSummary('AI hiện không khả dụng. Vui lòng thử lại sau.');
    }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!customer) return <div className="p-6 text-center text-charcoal-400">Không tìm thấy khách hàng.</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Thông tin' },
    { key: 'appointments', label: 'Lịch hẹn' },
    { key: 'services', label: 'Dịch vụ' },
    { key: 'invoices', label: 'Hóa đơn' },
    { key: 'ai', label: 'AI' },
  ];

  // Collect all services used
  const servicesUsed = appointments
    .flatMap((a) => a.appointment_details ?? [])
    .map((d) => d.service)
    .filter(Boolean) as Service[];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-charcoal-400 hover:text-charcoal-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-mauve-100 flex items-center justify-center text-mauve-600 text-2xl font-serif font-medium">
            {customer.full_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-medium text-charcoal-800">{customer.full_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-charcoal-500">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {customer.phone}</span>
              {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {customer.address}</span>}
              <span className="flex items-center gap-1.5"><Gift className="w-4 h-4" /> {customer.loyalty_points} điểm</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {customer.status === 'active' ? 'Hoạt động' : 'Ngừng'}
            </span>
          </div>
        </div>

        {/* AI Summary card */}
        <div className="mt-5 p-4 bg-gradient-to-br from-mauve-50 to-rose-50 border border-mauve-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-mauve-600">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Tóm tắt hồ sơ</span>
            </div>
            <button onClick={generateSummary} disabled={aiLoading} className="text-xs text-mauve-600 hover:text-mauve-700 font-medium">
              {aiLoading ? 'Đang tạo...' : aiSummary ? 'Tạo lại' : 'Tạo tóm tắt'}
            </button>
          </div>
          {aiSummary ? (
            <p className="text-sm text-charcoal-600 whitespace-pre-wrap">{aiSummary}</p>
          ) : (
            <p className="text-sm text-charcoal-400">Bấm "Tạo tóm tắt" để AI phân tích hồ sơ khách hàng.</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-charcoal-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key ? 'border-rose-500 text-rose-600' : 'border-transparent text-charcoal-400 hover:text-charcoal-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Họ và tên" value={customer.full_name} />
              <InfoRow label="Số điện thoại" value={customer.phone} />
              <InfoRow label="Email" value={customer.email ?? '—'} />
              <InfoRow label="Ngày sinh" value={customer.dob ? formatDate(customer.dob) : '—'} />
              <InfoRow label="Giới tính" value={customer.gender ? GENDER_LABELS[customer.gender] : '—'} />
              <InfoRow label="Địa chỉ" value={customer.address ?? '—'} />
              <InfoRow label="Điểm tích lũy" value={`${customer.loyalty_points} điểm`} />
              <InfoRow label="Ghi chú" value={customer.notes ?? '—'} />
            </div>
          )}

          {tab === 'appointments' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-8">Chưa có lịch hẹn nào.</p>
              ) : appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-ivory rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-charcoal-700">{formatDate(a.appointment_date)} • {formatTime(a.start_time)} - {formatTime(a.end_time)}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">
                      {(a.appointment_details ?? []).map((d) => d.service?.name).filter(Boolean).join(', ') || 'Chưa có dịch vụ'}
                      {a.therapist && ` • ${a.therapist.full_name}`}
                    </p>
                  </div>
                  <span className={`badge ${APPOINTMENT_STATUS_COLORS[a.status]}`}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'services' && (
            <div className="space-y-3">
              {servicesUsed.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-8">Chưa sử dụng dịch vụ nào.</p>
              ) : (
                <>
                  {Array.from(new Set(servicesUsed.map((s) => s.name))).map((name) => {
                    const svc = servicesUsed.find((s) => s.name === name)!;
                    const count = servicesUsed.filter((s) => s.name === name).length;
                    return (
                      <div key={name} className="flex items-center justify-between p-3 bg-ivory rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-charcoal-700">{svc.name}</p>
                          <p className="text-xs text-charcoal-400">{svc.category} • {formatCurrency(svc.price)}</p>
                        </div>
                        <span className="badge bg-rose-50 text-rose-600 border-rose-100">{count} lần</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-sm text-charcoal-400 text-center py-8">Chưa có hóa đơn nào.</p>
              ) : invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-ivory rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-charcoal-700">{formatDate(inv.created_at)}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">Tổng: {formatCurrency(inv.total_amount)} • Đã trả: {formatCurrency(inv.paid_amount)}</p>
                  </div>
                  <span className={`badge ${PAYMENT_STATUS_COLORS[inv.payment_status]}`}>{PAYMENT_STATUS_LABELS[inv.payment_status]}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'ai' && (
            <div className="space-y-3">
              {aiHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-10 h-10 text-charcoal-300 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-400">Chưa có hoạt động AI nào cho khách hàng này.</p>
                </div>
              ) : aiHistory.map((h) => (
                <div key={h.id} className="p-3 bg-ivory rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-mauve-50 text-mauve-600 border-mauve-100">
                      {h.ai_type === 'suggestion' ? 'Gợi ý dịch vụ' : h.ai_type === 'message' ? 'Tin chăm sóc' : 'Tóm tắt hồ sơ'}
                    </span>
                    <span className="text-xs text-charcoal-400">{formatDate(h.created_at)}</span>
                  </div>
                  <p className="text-sm text-charcoal-600 mt-1 whitespace-pre-wrap">{h.output_content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-charcoal-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-charcoal-700">{value}</p>
    </div>
  );
}
