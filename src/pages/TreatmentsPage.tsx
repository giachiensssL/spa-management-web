import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Flower2, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Treatment, Service } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDuration } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; selectedServices: string[] }>({ name: '', description: '', selectedServices: [] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('treatments').select('*, treatment_details(*, service:services(*))').order('created_at', { ascending: false });
    if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
    const { data } = await query;
    setTreatments(data as Treatment[] ?? []);
    const { data: svcs } = await supabase.from('services').select('*').eq('status', 'active').order('name');
    setServices(svcs as Service[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', selectedServices: [] }); setFormError(''); setModalOpen(true); };
  const openEdit = async (t: Treatment) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? '', selectedServices: (t.treatment_details ?? []).map((d) => d.service_id) });
    setFormError(''); setModalOpen(true);
  };

  const calcTotals = (svcIds: string[]) => {
    const selected = services.filter((s) => svcIds.includes(s.id));
    return {
      duration: selected.reduce((sum, s) => sum + s.duration, 0),
      price: selected.reduce((sum, s) => sum + s.price, 0),
    };
  };

  const save = async () => {
    setFormError('');
    if (!form.name.trim()) { setFormError('Vui lòng nhập tên liệu trình.'); return; }
    if (form.selectedServices.length === 0) { setFormError('Vui lòng chọn ít nhất một dịch vụ.'); return; }
    setSaving(true);
    const totals = calcTotals(form.selectedServices);
    const payload = { name: form.name, description: form.description || null, total_duration: totals.duration, total_price: totals.price, status: 'active' as const };
    let treatmentId = editing?.id;
    if (editing) {
      await supabase.from('treatments').update(payload).eq('id', editing.id);
      await supabase.from('treatment_details').delete().eq('treatment_id', editing.id);
    } else {
      const { data, error } = await supabase.from('treatments').insert(payload).select().single();
      if (error) { setFormError('Không thể tạo liệu trình.'); setSaving(false); return; }
      treatmentId = data.id;
    }
    if (treatmentId) {
      await supabase.from('treatment_details').insert(form.selectedServices.map((sid) => ({ treatment_id: treatmentId, service_id: sid })));
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (t: Treatment) => {
    if (confirm(`Xóa liệu trình "${t.name}"?`)) { await supabase.from('treatments').delete().eq('id', t.id); load(); }
  };

  const toggleService = (sid: string) => {
    setForm((f) => ({
      ...f,
      selectedServices: f.selectedServices.includes(sid) ? f.selectedServices.filter((x) => x !== sid) : [...f.selectedServices, sid],
    }));
  };

  const totals = calcTotals(form.selectedServices);

  return (
    <div className="p-6">
      <PageHeader title="Quản lý liệu trình" subtitle="Liệu trình chăm sóc gồm nhiều dịch vụ"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm liệu trình</button>} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm liệu trình..." />
        </div>
      </div>

      {loading ? <LoadingState /> : treatments.length === 0 ? (
        <div className="card"><EmptyState icon={<Flower2 className="w-8 h-8" />} title="Chưa có liệu trình" description="Tạo liệu trình đầu tiên cho spa." action={<button onClick={openAdd} className="btn-primary">Thêm liệu trình</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treatments.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-serif text-lg text-charcoal-800">{t.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t)} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-charcoal-500 mb-3 line-clamp-2">{t.description ?? 'Không có mô tả'}</p>
              <div className="space-y-1 mb-3">
                {(t.treatment_details ?? []).map((d) => (
                  <div key={d.id} className="text-xs text-charcoal-500 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-rose-400" /> {d.service?.name}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-charcoal-50 text-sm">
                <span className="flex items-center gap-1 text-charcoal-600"><Clock className="w-4 h-4 text-charcoal-400" /> {formatDuration(t.total_duration)}</span>
                <span className="flex items-center gap-1 font-medium text-rose-600"><DollarSign className="w-4 h-4" /> {formatCurrency(t.total_price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa liệu trình' : 'Thêm liệu trình'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label-field">Tên liệu trình <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên liệu trình" />
          </div>
          <div>
            <label className="label-field">Mô tả</label>
            <textarea className="input-field min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả liệu trình" />
          </div>
          <div>
            <label className="label-field">Chọn dịch vụ <span className="text-rose-500">*</span></label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-charcoal-100 rounded-lg p-3">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-ivory p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={form.selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} className="rounded border-charcoal-300 text-rose-500 focus:ring-rose-300" />
                  <div className="flex-1">
                    <span className="text-sm text-charcoal-700">{s.name}</span>
                    <span className="text-xs text-charcoal-400 ml-2">{formatDuration(s.duration)} • {formatCurrency(s.price)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-ivory rounded-lg">
            <span className="text-sm text-charcoal-500">Tổng thời lượng: <strong className="text-charcoal-700">{formatDuration(totals.duration)}</strong></span>
            <span className="text-sm text-charcoal-500">Tổng giá: <strong className="text-rose-600">{formatCurrency(totals.price)}</strong></span>
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
