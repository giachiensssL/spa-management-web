import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, UserX, UserCheck, Phone, Mail, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (debouncedSearch) {
      query = query.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
    }
    const { data, error } = await query;
    if (error) console.error(error);
    setCustomers(data as Customer[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const openAdd = () => {
    setEditing(null);
    setForm({ status: 'active', gender: 'female', loyalty_points: 0 });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm(c);
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    setFormError('');
    if (!form.full_name?.trim()) { setFormError('Vui lòng nhập họ và tên.'); return; }
    if (!form.phone?.trim()) { setFormError('Vui lòng nhập số điện thoại.'); return; }

    setSaving(true);
    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || null,
      dob: form.dob || null,
      gender: form.gender || null,
      address: form.address || null,
      notes: form.notes || null,
      loyalty_points: form.loyalty_points ?? 0,
      status: form.status ?? 'active',
    };

    if (editing) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editing.id);
      if (error) {
        setFormError(error.code === '23505' ? 'Số điện thoại đã tồn tại.' : 'Không thể cập nhật khách hàng.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) {
        setFormError(error.code === '23505' ? 'Số điện thoại đã tồn tại.' : 'Không thể tạo khách hàng.');
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setModalOpen(false);
    loadCustomers();
  };

  const toggleStatus = async (c: Customer) => {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    await supabase.from('customers').update({ status: newStatus }).eq('id', c.id);
    loadCustomers();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý khách hàng"
        subtitle="Danh sách và thông tin khách hàng của spa"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm khách hàng</button>}
      />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Tìm theo tên hoặc số điện thoại..."
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : customers.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="w-8 h-8" />} title="Chưa có khách hàng" description="Thêm khách hàng đầu tiên cho spa của bạn." action={<button onClick={openAdd} className="btn-primary">Thêm khách hàng</button>} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal-100 bg-ivory">
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Họ và tên</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Số điện thoại</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden lg:table-cell">Ngày tạo</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Điểm tích lũy</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Trạng thái</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {customers.map((c) => (
                  <tr key={c.id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-charcoal-700">{c.full_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-600">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-600 hidden md:table-cell">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-500 hidden lg:table-cell">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-600">{c.loyalty_points}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {c.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Sửa"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => toggleStatus(c)} className="p-1.5 text-charcoal-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title={c.status === 'active' ? 'Ngừng hoạt động' : 'Kích hoạt'}>
                          {c.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Họ và tên <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.full_name ?? ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nhập họ và tên" />
          </div>
          <div>
            <label className="label-field">Số điện thoại <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nhập số điện thoại" />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Nhập email" />
          </div>
          <div>
            <label className="label-field">Ngày sinh</label>
            <input type="date" className="input-field" value={form.dob ?? ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Giới tính</label>
            <select className="input-field" value={form.gender ?? 'female'} onChange={(e) => setForm({ ...form, gender: e.target.value as Customer['gender'] })}>
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div>
            <label className="label-field">Điểm tích lũy</label>
            <input type="number" min={0} className="input-field" value={form.loyalty_points ?? 0} onChange={(e) => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Địa chỉ</label>
            <input className="input-field" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Nhập địa chỉ" />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Ghi chú</label>
            <textarea className="input-field min-h-[80px]" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú về khách hàng" />
          </div>
        </div>
        {formError && <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{formError}</div>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>
    </div>
  );
}
