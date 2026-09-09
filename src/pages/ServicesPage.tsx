import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Sparkles, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Service } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDuration, SERVICE_CATEGORIES } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<Partial<Service>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('services').select('*').order('created_at', { ascending: false });
    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%`);
    }
    const { data } = await query;
    setServices(data as Service[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ status: 'active', duration: 60, price: 0, category: SERVICE_CATEGORIES[0] }); setFormError(''); setModalOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm(s); setFormError(''); setModalOpen(true); };

  const save = async () => {
    setFormError('');
    if (!form.name?.trim()) { setFormError('Vui lòng nhập tên dịch vụ.'); return; }
    if (!form.duration || form.duration <= 0) { setFormError('Thời lượng phải lớn hơn 0.'); return; }
    if (form.price === undefined || form.price < 0) { setFormError('Giá dịch vụ không được nhỏ hơn 0.'); return; }
    setSaving(true);
    const payload = {
      name: form.name, description: form.description || null,
      duration: form.duration, price: form.price, category: form.category || null,
      status: form.status ?? 'active',
    };
    if (editing) {
      const { error } = await supabase.from('services').update(payload).eq('id', editing.id);
      if (error) { setFormError(error.code === '23505' ? 'Tên dịch vụ đã tồn tại.' : 'Không thể cập nhật.'); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('services').insert(payload);
      if (error) { setFormError(error.code === '23505' ? 'Tên dịch vụ đã tồn tại.' : 'Không thể tạo dịch vụ.'); setSaving(false); return; }
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (s: Service) => {
    if (confirm(`Xóa dịch vụ "${s.name}"?`)) {
      await supabase.from('services').delete().eq('id', s.id);
      load();
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Quản lý dịch vụ" subtitle="Danh sách các dịch vụ chăm sóc sắc đẹp"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm dịch vụ</button>} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm dịch vụ theo tên hoặc danh mục..." />
        </div>
      </div>

      {loading ? <LoadingState /> : services.length === 0 ? (
        <div className="card"><EmptyState icon={<Sparkles className="w-8 h-8" />} title="Chưa có dịch vụ" description="Thêm dịch vụ đầu tiên cho spa." action={<button onClick={openAdd} className="btn-primary">Thêm dịch vụ</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="card p-5 hover:shadow-elevated transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-charcoal-800">{s.name}</h3>
                  {s.category && <span className="text-xs text-mauve-500 mt-1 inline-block">{s.category}</span>}
                </div>
                <span className={`badge ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {s.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                </span>
              </div>
              <p className="text-sm text-charcoal-500 line-clamp-2 mb-3">{s.description ?? 'Không có mô tả'}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-charcoal-600">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-charcoal-400" /> {formatDuration(s.duration)}</span>
                  <span className="font-medium text-rose-600">{formatCurrency(s.price)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(s)} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label-field">Tên dịch vụ <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên dịch vụ" />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Mô tả</label>
            <textarea className="input-field min-h-[70px]" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả dịch vụ" />
          </div>
          <div>
            <label className="label-field">Thời lượng (phút) <span className="text-rose-500">*</span></label>
            <input type="number" min={1} className="input-field" value={form.duration ?? 60} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Giá (VNĐ) <span className="text-rose-500">*</span></label>
            <input type="number" min={0} className="input-field" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Danh mục</label>
            <select className="input-field" value={form.category ?? SERVICE_CATEGORIES[0]} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Trạng thái</label>
            <select className="input-field" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Service['status'] })}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Ngừng</option>
            </select>
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
