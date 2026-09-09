import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Calendar, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Package as Pkg, Treatment } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

export default function PackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; sessions: number; price: number; expiry_days: number; discount_percent: number; selectedTreatments: string[] }>({ name: '', description: '', sessions: 1, price: 0, expiry_days: 90, discount_percent: 10, selectedTreatments: [] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('packages').select('*, package_details(*, treatment:treatments(*))').order('created_at', { ascending: false });
    if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
    const { data } = await query;
    setPackages(data as Pkg[] ?? []);
    const { data: trts } = await supabase.from('treatments').select('*').eq('status', 'active').order('name');
    setTreatments(trts as Treatment[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', sessions: 1, price: 0, expiry_days: 90, discount_percent: 10, selectedTreatments: [] }); setFormError(''); setModalOpen(true); };
  const openEdit = (p: Pkg) => { setEditing(p); setForm({ name: p.name, description: p.description ?? '', sessions: p.sessions, price: p.price, expiry_days: p.expiry_days ?? 90, discount_percent: p.discount_percent, selectedTreatments: (p.package_details ?? []).map((d) => d.treatment_id) }); setFormError(''); setModalOpen(true); };

  const save = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Vui lòng nhập tên gói.'); return; }
    if (form.sessions <= 0) { setFormError('Số buổi phải lớn hơn 0.'); return; }
    if (form.price < 0) { setFormError('Giá gói không được nhỏ hơn 0.'); return; }
    if (form.selectedTreatments.length === 0) { setFormError('Vui lòng chọn ít nhất một liệu trình.'); return; }
    setSaving(true);
    const payload = { name: form.name, description: form.description || null, sessions: form.sessions, price: form.price, expiry_days: form.expiry_days || null, discount_percent: form.discount_percent, status: 'active' as const };
    let pkgId = editing?.id;
    if (editing) {
      await supabase.from('packages').update(payload).eq('id', editing.id);
      await supabase.from('package_details').delete().eq('package_id', editing.id);
    } else {
      const { data, error } = await supabase.from('packages').insert(payload).select().single();
      if (error) { setFormError('Không thể tạo gói.'); setSaving(false); return; }
      pkgId = data.id;
    }
    if (pkgId) {
      await supabase.from('package_details').insert(form.selectedTreatments.map((tid) => ({ package_id: pkgId, treatment_id: tid })));
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (p: Pkg) => { if (confirm(`Xóa gói "${p.name}"?`)) { await supabase.from('packages').delete().eq('id', p.id); load(); } };
  const toggleTrt = (tid: string) => setForm((f) => ({ ...f, selectedTreatments: f.selectedTreatments.includes(tid) ? f.selectedTreatments.filter((x) => x !== tid) : [...f.selectedTreatments, tid] }));

  return (
    <div className="p-6">
      <PageHeader title="Quản lý gói chăm sóc" subtitle="Các gói chăm sóc bao gồm nhiều liệu trình"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm gói</button>} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm gói chăm sóc..." />
        </div>
      </div>

      {loading ? <LoadingState /> : packages.length === 0 ? (
        <div className="card"><EmptyState icon={<Package className="w-8 h-8" />} title="Chưa có gói chăm sóc" description="Tạo gói chăm sóc đầu tiên." action={<button onClick={openAdd} className="btn-primary">Thêm gói</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-serif text-lg text-charcoal-800">{p.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(p)} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-charcoal-500 mb-3 line-clamp-2">{p.description ?? 'Không có mô tả'}</p>
              <div className="space-y-1 mb-3">
                {(p.package_details ?? []).map((d) => (
                  <div key={d.id} className="text-xs text-charcoal-500 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-mauve-400" /> {d.treatment?.name}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-charcoal-50 text-sm">
                <span className="text-charcoal-600">{p.sessions} buổi</span>
                {p.expiry_days && <span className="flex items-center gap-1 text-charcoal-500"><Calendar className="w-3.5 h-3.5" /> {p.expiry_days} ngày</span>}
                <span className="flex items-center gap-1 text-gold-600"><Percent className="w-3.5 h-3.5" /> {p.discount_percent}%</span>
                <span className="font-medium text-rose-600 ml-auto">{formatCurrency(p.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa gói' : 'Thêm gói'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label-field">Tên gói <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên gói" />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Mô tả</label>
            <textarea className="input-field min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả gói" />
          </div>
          <div>
            <label className="label-field">Số buổi <span className="text-rose-500">*</span></label>
            <input type="number" min={1} className="input-field" value={form.sessions} onChange={(e) => setForm({ ...form, sessions: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="label-field">Giá gói (VNĐ) <span className="text-rose-500">*</span></label>
            <input type="number" min={0} className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Thời hạn (ngày)</label>
            <input type="number" min={1} className="input-field" value={form.expiry_days} onChange={(e) => setForm({ ...form, expiry_days: parseInt(e.target.value) || 90 })} />
          </div>
          <div>
            <label className="label-field">Phần trăm giảm giá (%)</label>
            <input type="number" min={0} max={100} step="0.5" className="input-field" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Chọn liệu trình <span className="text-rose-500">*</span></label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-charcoal-100 rounded-lg p-3">
              {treatments.map((t) => (
                <label key={t.id} className="flex items-center gap-3 cursor-pointer hover:bg-ivory p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={form.selectedTreatments.includes(t.id)} onChange={() => toggleTrt(t.id)} className="rounded border-charcoal-300 text-rose-500 focus:ring-rose-300" />
                  <div className="flex-1">
                    <span className="text-sm text-charcoal-700">{t.name}</span>
                    <span className="text-xs text-charcoal-400 ml-2">{formatCurrency(t.total_price)}</span>
                  </div>
                </label>
              ))}
            </div>
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
