import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Receipt, DollarSign, CreditCard, Banknote, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Invoice, Customer, Service, Product, PaymentMethod, PaymentStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

interface LineItem {
  item_type: 'service' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export default function InvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<{ customer_id: string; lineItems: LineItem[]; payment_method: PaymentMethod; paid_amount: number; notes: string }>({ customer_id: '', lineItems: [], payment_method: 'cash', paid_amount: 0, notes: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('invoices').select('*, customer:customers(*), invoice_details(*)').order('created_at', { ascending: false });
    if (debouncedSearch) {
      query = query.ilike('notes', `%${debouncedSearch}%`);
    }
    const { data } = await query;
    setInvoices(data as Invoice[] ?? []);
    const [cRes, sRes, pRes] = await Promise.all([
      supabase.from('customers').select('*').eq('status', 'active').order('full_name'),
      supabase.from('services').select('*').eq('status', 'active').order('name'),
      supabase.from('products').select('*').eq('status', 'active').order('name'),
    ]);
    setCustomers(cRes.data as Customer[] ?? []);
    setServices(sRes.data as Service[] ?? []);
    setProducts(pRes.data as Product[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ customer_id: '', lineItems: [], payment_method: 'cash', paid_amount: 0, notes: '' }); setFormError(''); setModalOpen(true); };

  const addService = (s: Service) => {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { item_type: 'service', item_id: s.id, item_name: s.name, quantity: 1, unit_price: s.price }] }));
  };
  const addProduct = (p: Product) => {
    if (p.stock_quantity <= 0) { setFormError('Sản phẩm không đủ số lượng tồn kho.'); return; }
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { item_type: 'product', item_id: p.id, item_name: p.name, quantity: 1, unit_price: p.sale_price }] }));
  };
  const removeLine = (idx: number) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));
  const updateLineQty = (idx: number, qty: number) => {
    setForm((f) => ({ ...f, lineItems: f.lineItems.map((li, i) => i === idx ? { ...li, quantity: Math.max(1, qty) } : li) }));
  };

  const totalAmount = form.lineItems.reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  const save = async () => {
    setFormError('');
    if (!form.customer_id) { setFormError('Vui lòng chọn khách hàng.'); return; }
    if (form.lineItems.length === 0) { setFormError('Vui lòng thêm ít nhất một dịch vụ hoặc sản phẩm.'); return; }
    if (form.paid_amount < 0) { setFormError('Số tiền thanh toán không được nhỏ hơn 0.'); return; }

    // Check product stock
    for (const li of form.lineItems) {
      if (li.item_type === 'product') {
        const prod = products.find((p) => p.id === li.item_id);
        if (prod && li.quantity > prod.stock_quantity) { setFormError(`Sản phẩm "${li.item_name}" không đủ số lượng tồn kho.`); return; }
      }
    }

    setSaving(true);
    const paymentStatus: PaymentStatus = form.paid_amount >= totalAmount ? 'paid' : form.paid_amount > 0 ? 'partial' : 'unpaid';
    const { data: inv, error } = await supabase.from('invoices').insert({
      customer_id: form.customer_id, total_amount: totalAmount, paid_amount: form.paid_amount,
      payment_method: form.paid_amount > 0 ? form.payment_method : null, payment_status: paymentStatus,
      notes: form.notes || null, created_by: profile?.id ?? null,
    }).select().single();
    if (error) { setFormError('Không thể tạo hóa đơn.'); setSaving(false); return; }

    await supabase.from('invoice_details').insert(form.lineItems.map((li) => ({ invoice_id: inv.id, item_type: li.item_type, item_id: li.item_id, item_name: li.item_name, quantity: li.quantity, unit_price: li.unit_price })));

    // Deduct product stock
    for (const li of form.lineItems) {
      if (li.item_type === 'product') {
        const prod = products.find((p) => p.id === li.item_id);
        if (prod) await supabase.from('products').update({ stock_quantity: prod.stock_quantity - li.quantity }).eq('id', li.item_id);
      }
    }

    setSaving(false); setModalOpen(false); load();
  };

  const openPay = (inv: Invoice) => { setPayingInvoice(inv); setPayAmount(inv.total_amount - inv.paid_amount); setPayModalOpen(true); };

  const recordPayment = async () => {
    if (!payingInvoice) return;
    const newPaid = payingInvoice.paid_amount + payAmount;
    const status: PaymentStatus = newPaid >= payingInvoice.total_amount ? 'paid' : 'partial';
    await supabase.from('invoices').update({ paid_amount: newPaid, payment_status: status }).eq('id', payingInvoice.id);
    setPayModalOpen(false); load();
  };

  if (loading) return <div className="p-6"><LoadingState /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Quản lý hóa đơn" subtitle="Hóa đơn và thanh toán"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Tạo hóa đơn</button>} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm hóa đơn..." />
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="card"><EmptyState icon={<Receipt className="w-8 h-8" />} title="Chưa có hóa đơn" description="Tạo hóa đơn đầu tiên." action={<button onClick={openAdd} className="btn-primary">Tạo hóa đơn</button>} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal-100 bg-ivory">
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Ngày</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Khách hàng</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Tổng tiền</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Đã trả</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden md:table-cell">Còn lại</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden lg:table-cell">PT thanh toán</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Trạng thái</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="px-4 py-3 text-sm text-charcoal-600">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-charcoal-700">{inv.customer?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-700 text-right">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 text-right">{formatCurrency(inv.paid_amount)}</td>
                    <td className="px-4 py-3 text-sm text-rose-600 text-right hidden md:table-cell">{formatCurrency(inv.total_amount - inv.paid_amount)}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-500 hidden lg:table-cell">{inv.payment_method ? PAYMENT_METHOD_LABELS[inv.payment_method] : '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${PAYMENT_STATUS_COLORS[inv.payment_status]}`}>{PAYMENT_STATUS_LABELS[inv.payment_status]}</span></td>
                    <td className="px-4 py-3 text-right">
                      {inv.payment_status !== 'paid' && <button onClick={() => openPay(inv)} className="text-sm text-rose-500 hover:text-rose-600 font-medium">Thanh toán</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo hóa đơn" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="label-field">Khách hàng <span className="text-rose-500">*</span></label>
              <select className="input-field" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                <option value="">Chọn khách hàng</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} - {c.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Thêm dịch vụ</label>
              <select className="input-field" value="" onChange={(e) => { const s = services.find((x) => x.id === e.target.value); if (s) addService(s); }}>
                <option value="">Chọn dịch vụ...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Thêm sản phẩm</label>
              <select className="input-field" value="" onChange={(e) => { const p = products.find((x) => x.id === e.target.value); if (p) addProduct(p); }}>
                <option value="">Chọn sản phẩm...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.sale_price)} (còn {p.stock_quantity})</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Ghi chú</label>
              <textarea className="input-field min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú hóa đơn" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="label-field">Chi tiết hóa đơn</label>
            {form.lineItems.length === 0 ? (
              <p className="text-sm text-charcoal-400 text-center py-8 bg-ivory rounded-lg">Chưa có mục nào.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {form.lineItems.map((li, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-ivory rounded-lg">
                    <span className={`badge ${li.item_type === 'service' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{li.item_type === 'service' ? 'DV' : 'SP'}</span>
                    <span className="text-sm text-charcoal-700 flex-1 truncate">{li.item_name}</span>
                    <input type="number" min={1} value={li.quantity} onChange={(e) => updateLineQty(idx, parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 text-sm border border-charcoal-200 rounded" />
                    <span className="text-sm text-charcoal-600 w-24 text-right">{formatCurrency(li.unit_price * li.quantity)}</span>
                    <button onClick={() => removeLine(idx)} className="text-charcoal-300 hover:text-rose-500"><Plus className="w-4 h-4 rotate-45" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-charcoal-100">
              <span className="text-sm font-medium text-charcoal-600">Tổng cộng</span>
              <span className="text-lg font-semibold text-rose-600">{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <label className="label-field">Phương thức thanh toán</label>
              <select className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}>
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="card">Thẻ</option>
              </select>
            </div>
            <div>
              <label className="label-field">Số tiền thanh toán (VNĐ)</label>
              <input type="number" min={0} max={totalAmount} className="input-field" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: parseFloat(e.target.value) || 0 })} />
              <p className="text-xs text-charcoal-400 mt-1">Còn lại: {formatCurrency(totalAmount - form.paid_amount)}</p>
            </div>
          </div>
        </div>
        {formError && <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{formError}</div>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Tạo hóa đơn'}</button>
        </div>
      </Modal>

      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} title="Thanh toán hóa đơn" size="sm">
        {payingInvoice && (
          <div className="space-y-4">
            <div className="p-3 bg-ivory rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-charcoal-500">Khách hàng:</span><span className="font-medium text-charcoal-700">{payingInvoice.customer?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Tổng tiền:</span><span className="font-medium text-charcoal-700">{formatCurrency(payingInvoice.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Đã trả:</span><span className="font-medium text-emerald-600">{formatCurrency(payingInvoice.paid_amount)}</span></div>
              <div className="flex justify-between"><span className="text-charcoal-500">Còn lại:</span><span className="font-medium text-rose-600">{formatCurrency(payingInvoice.total_amount - payingInvoice.paid_amount)}</span></div>
            </div>
            <div>
              <label className="label-field">Số tiền thanh toán (VNĐ)</label>
              <input type="number" min={0} max={payingInvoice.total_amount - payingInvoice.paid_amount} className="input-field" value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPayModalOpen(false)} className="btn-secondary">Hủy</button>
              <button onClick={recordPayment} className="btn-primary">Xác nhận thanh toán</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
