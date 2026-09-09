import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Search, UserCog, Phone, Mail, BadgeCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

const POSITIONS = ['Kỹ thuật viên', 'Lễ tân', 'Quản lý', 'Thu ngân', 'Khác'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (debouncedSearch) query = query.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,position.ilike.%${debouncedSearch}%`);
    const { data } = await query;
    setEmployees(data as Employee[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ status: 'active', salary: 0, position: POSITIONS[0] }); setFormError(''); setModalOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setForm(e); setFormError(''); setModalOpen(true); };

  const save = async () => {
    setFormError('');
    if (!form.full_name?.trim()) { setFormError('Vui lòng nhập họ và tên.'); return; }
    setSaving(true);
    const payload = {
      full_name: form.full_name, phone: form.phone || null, email: form.email || null,
      position: form.position || null, specialty: form.specialty || null,
      working_hours: form.working_hours || null, hire_date: form.hire_date || null,
      salary: form.salary ?? 0, status: form.status ?? 'active',
    };
    if (editing) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editing.id);
      if (error) { setFormError('Không thể cập nhật.'); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('employees').insert(payload);
      if (error) { setFormError('Không thể tạo nhân viên.'); setSaving(false); return; }
    }
    setSaving(false); setModalOpen(false); load();
  };

  const toggleStatus = async (e: Employee) => {
    await supabase.from('employees').update({ status: e.status === 'active' ? 'inactive' : 'active' }).eq('id', e.id);
    load();
  };

  return (
    <div className="p-6">
      <PageHeader title="Quản lý nhân viên" subtitle="Danh sách nhân viên của spa"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm nhân viên</button>} />

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm nhân viên theo tên, số điện thoại hoặc chức vụ..." />
        </div>
      </div>

      {loading ? <LoadingState /> : employees.length === 0 ? (
        <div className="card"><EmptyState icon={<UserCog className="w-8 h-8" />} title="Chưa có nhân viên" description="Thêm nhân viên đầu tiên." action={<button onClick={openAdd} className="btn-primary">Thêm nhân viên</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-mauve-100 flex items-center justify-center text-mauve-600 font-serif text-lg font-medium flex-shrink-0">
                  {e.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg text-charcoal-800 truncate">{e.full_name}</h3>
                    {e.status === 'active' && <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-mauve-500">{e.position ?? 'Chưa phân chức vụ'}</p>
                  {e.specialty && <p className="text-xs text-charcoal-400 mt-0.5">Chuyên môn: {e.specialty}</p>}
                </div>
                <button onClick={() => openEdit(e)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 space-y-1 text-sm text-charcoal-500">
                {e.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {e.phone}</p>}
                {e.email && <p className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5" /> {e.email}</p>}
                {e.working_hours && <p className="text-xs">Giờ làm việc: {e.working_hours}</p>}
                {e.hire_date && <p className="text-xs">Ngày vào làm: {formatDate(e.hire_date)}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-charcoal-50 flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal-700">{formatCurrency(e.salary)}</span>
                <button onClick={() => toggleStatus(e)} className={`badge ${e.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'} cursor-pointer hover:opacity-80`}>
                  {e.status === 'active' ? 'Đang làm việc' : 'Nghỉ việc'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Họ và tên <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.full_name ?? ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nhập họ và tên" />
          </div>
          <div>
            <label className="label-field">Số điện thoại</label>
            <input className="input-field" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nhập số điện thoại" />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input className="input-field" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Nhập email" />
          </div>
          <div>
            <label className="label-field">Chức vụ</label>
            <select className="input-field" value={form.position ?? POSITIONS[0]} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Chuyên môn</label>
            <input className="input-field" value={form.specialty ?? ''} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Nhập chuyên môn" />
          </div>
          <div>
            <label className="label-field">Giờ làm việc</label>
            <input className="input-field" value={form.working_hours ?? ''} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} placeholder="VD: 8:00 - 17:00" />
          </div>
          <div>
            <label className="label-field">Ngày vào làm</label>
            <input type="date" className="input-field" value={form.hire_date ?? ''} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Lương (VNĐ)</label>
            <input type="number" min={0} className="input-field" value={form.salary ?? 0} onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Trạng thái</label>
            <select className="input-field" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Employee['status'] })}>
              <option value="active">Đang làm việc</option>
              <option value="inactive">Nghỉ việc</option>
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
