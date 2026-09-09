import { useEffect, useState } from 'react';
import { Sparkles, MessageSquare, FileText, Bot, Copy, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer, Service, Appointment, AIHistory } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatTime } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/EmptyState';

type AITab = 'suggestion' | 'message' | 'summary';

export default function AIAssistantPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<AITab>('suggestion');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerNeed, setSelectedNeed] = useState('');
  const [messageType, setMessageType] = useState<'reminder' | 'aftercare' | 'reengage'>('reminder');
  const [result, setResult] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ suggestions?: { name: string; reason: string }[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<AIHistory[]>([]);

  useEffect(() => {
    (async () => {
      const [cRes, sRes] = await Promise.all([
        supabase.from('customers').select('*').eq('status', 'active').order('full_name'),
        supabase.from('services').select('*').eq('status', 'active').order('name'),
      ]);
      setCustomers(cRes.data as Customer[] ?? []);
      setServices(sRes.data as Service[] ?? []);
      setLoading(false);
    })();
  }, []);

  const loadHistory = async (customerId?: string) => {
    let q = supabase.from('ai_history').select('*').order('created_at', { ascending: false }).limit(10);
    if (customerId) q = q.eq('customer_id', customerId);
    const { data } = await q;
    setHistory(data as AIHistory[] ?? []);
  };

  useEffect(() => { loadHistory(); }, []);

  const callAI = async (action: string, payload: Record<string, unknown>) => {
    setAiLoading(true); setError(''); setResult(null); setResultData(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action, ...payload, created_by: profile?.id }),
      });
      if (!response.ok) throw new Error('AI error');
      const data = await response.json();
      if (data.error) { setError(data.error); return; }
      if (action === 'recommend-services' && data.suggestions) {
        setResultData({ suggestions: data.suggestions });
        setResult(data.suggestions.map((s: { name: string; reason: string }, i: number) => `Gợi ý ${i + 1}:\n${s.name}\n\nLý do:\n${s.reason}`).join('\n\n---\n\n'));
      } else {
        setResult(data.summary || data.message || data.content || 'AI hiện không khả dụng. Vui lòng thử lại sau.');
      }
      loadHistory(selectedCustomer || undefined);
    } catch {
      setError('AI hiện không khả dụng. Vui lòng thử lại sau.');
    }
    setAiLoading(false);
  };

  const handleSuggestion = () => {
    if (!selectedCustomer) { setError('Vui lòng chọn khách hàng.'); return; }
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;
    callAI('recommend-services', { customer, customer_need: customerNeed, available_services: services });
  };

  const handleMessage = () => {
    if (!selectedCustomer) { setError('Vui lòng chọn khách hàng.'); return; }
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;
    callAI('generate-message', { customer, message_type: messageType });
  };

  const handleSummary = () => {
    if (!selectedCustomer) { setError('Vui lòng chọn khách hàng.'); return; }
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) return;
    callAI('customer-summary', { customer });
  };

  const copyResult = () => {
    if (result) navigator.clipboard.writeText(result);
  };

  if (loading) return <div className="p-6"><LoadingState /></div>;

  const tabs: { key: AITab; label: string; icon: typeof Sparkles }[] = [
    { key: 'suggestion', label: 'Gợi ý dịch vụ', icon: Sparkles },
    { key: 'message', label: 'Soạn tin chăm sóc', icon: MessageSquare },
    { key: 'summary', label: 'Tóm tắt hồ sơ', icon: FileText },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="AI Trợ lý Spa" subtitle="Trợ lý AI thông minh hỗ trợ công việc hàng ngày" />

      {/* Tab cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setResult(null); setResultData(null); setError(''); }}
              className={`card p-5 text-left transition-all ${tab === t.key ? 'ring-2 ring-rose-300 bg-rose-50/50' : 'hover:shadow-elevated'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tab === t.key ? 'bg-rose-100 text-rose-600' : 'bg-charcoal-50 text-charcoal-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-serif text-lg text-charcoal-800">{t.label}</span>
              </div>
              <p className="text-sm text-charcoal-400">
                {t.key === 'suggestion' && 'Gợi ý tối đa 2 dịch vụ phù hợp cho khách hàng'}
                {t.key === 'message' && 'Soạn tin nhắn nhắc lịch, cảm ơn hoặc kết nối lại'}
                {t.key === 'summary' && 'Tóm tắt hồ sơ khách hàng dựa trên lịch sử'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-4">
            {tab === 'suggestion' && 'Gợi ý dịch vụ'}
            {tab === 'message' && 'Soạn tin chăm sóc'}
            {tab === 'summary' && 'Tóm tắt hồ sơ'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label-field">Khách hàng <span className="text-rose-500">*</span></label>
              <select className="input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">Chọn khách hàng</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} - {c.phone}</option>)}
              </select>
            </div>
            {tab === 'suggestion' && (
              <div>
                <label className="label-field">Nhu cầu hiện tại</label>
                <textarea className="input-field min-h-[80px]" value={customerNeed} onChange={(e) => setSelectedNeed(e.target.value)} placeholder="VD: Khách muốn làm sáng da, giảm thâm nám..." />
              </div>
            )}
            {tab === 'message' && (
              <div>
                <label className="label-field">Loại tin nhắn</label>
                <div className="space-y-2">
                  {[
                    { key: 'reminder' as const, label: 'Nhắc lịch hẹn' },
                    { key: 'aftercare' as const, label: 'Cảm ơn sau dịch vụ' },
                    { key: 'reengage' as const, label: 'Kết nối lại khách cũ' },
                  ].map((m) => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-ivory transition-colors">
                      <input type="radio" checked={messageType === m.key} onChange={() => setMessageType(m.key)} className="text-rose-500 focus:ring-rose-300" />
                      <span className="text-sm text-charcoal-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={tab === 'suggestion' ? handleSuggestion : tab === 'message' ? handleMessage : handleSummary}
              disabled={aiLoading || !selectedCustomer}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> {aiLoading ? 'Đang xử lý...' : 'Tạo kết quả'}
            </button>
          </div>
        </div>

        {/* Result panel */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-charcoal-800">Kết quả</h3>
            {result && (
              <div className="flex gap-1">
                <button onClick={copyResult} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Sao chép"><Copy className="w-4 h-4" /></button>
                <button onClick={tab === 'suggestion' ? handleSuggestion : tab === 'message' ? handleMessage : handleSummary} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Tạo lại"><RefreshCw className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-charcoal-400">
                <Bot className="w-5 h-5 animate-pulse" /> <span className="text-sm">AI đang phân tích...</span>
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          ) : resultData?.suggestions ? (
            <div className="space-y-4">
              {resultData.suggestions.map((s, i) => (
                <div key={i} className="p-4 bg-gradient-to-br from-mauve-50 to-rose-50 border border-mauve-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium">{i + 1}</span>
                    <span className="font-medium text-charcoal-800">{s.name}</span>
                  </div>
                  <p className="text-sm text-charcoal-600"><span className="font-medium">Lý do:</span> {s.reason}</p>
                </div>
              ))}
              <p className="text-xs text-charcoal-300 text-center italic">Không tư vấn y khoa.</p>
            </div>
          ) : result ? (
            <div>
              <div className="p-4 bg-ivory rounded-xl whitespace-pre-wrap text-sm text-charcoal-600 leading-relaxed">{result}</div>
              <p className="text-xs text-charcoal-300 text-center italic mt-3">Không tư vấn y khoa.</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="w-10 h-10 text-charcoal-200 mx-auto mb-2" />
              <p className="text-sm text-charcoal-400">Chọn khách hàng và nhấn "Tạo kết quả" để bắt đầu.</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="font-serif text-lg text-charcoal-800 mb-3">Lịch sử AI gần đây</h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="card p-3 flex items-start gap-3">
                <span className="badge bg-mauve-50 text-mauve-600 border-mauve-100 mt-0.5">
                  {h.ai_type === 'suggestion' ? 'Gợi ý' : h.ai_type === 'message' ? 'Tin nhắn' : 'Tóm tắt'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-charcoal-400">{formatDate(h.created_at)}</p>
                  <p className="text-sm text-charcoal-600 truncate">{h.output_content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
