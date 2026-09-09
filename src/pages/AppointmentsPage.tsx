import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Calendar as CalIcon, List, Clock, User, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Appointment, Customer, Employee, Service, AppointmentStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatTime, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

type ViewMode = 'day' | 'week' | 'list';

const STATUS_FLOW: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];
const NEXT_STATUS: Record<AppointmentStatus, AppointmentStatus | null> = {
  pending: 'confirmed', confirmed: 'in_progress', in_progress: 'completed', completed: null,
  cancelled: null, no_show: null,
};

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const isTherapist = profile?.role === 'therapist';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<{ customer_id: string; therapist_id: string; appointment_date: string; start_time: string; end_time: string; service_ids: string[]; notes: string; status: AppointmentStatus }>({ customer_id: '', therapist_id: '', appointment_date: selectedDate, start_time: '09:00', end_time: '10:00', service_ids: [], notes: '', status: 'pending' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('appointments')
      .select('*, customer:customers(*), therapist:employees(*), appointment_details(*, service:services(*))')
      .order('appointment_date', { ascending: false });

    if (isTherapist && profile?.employee_id) {
      query = query.eq('therapist_id', profile.employee_id);
    }

    const { data } = await query;
    setAppointments(data as Appointment[] ?? []);

    const [custRes, empRes, svcRes] = await Promise.all([
      supabase.from('customers').select('*').eq('status', 'active').order('full_name'),
      supabase.from('employees').select('*').eq('status', 'active').eq('position', 'Kỹ thuật viên').order('full_name'),
      supabase.from('services').select('*').eq('status', 'active').order('name'),
    ]);
    setCustomers(custRes.data as Customer[] ?? []);
    setEmployees(empRes.data as Employee[] ?? []);
    setServices(svcRes.data as Service[] ?? []);
    setLoading(false);
  }, [isTherapist, profile?.employee_id]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ customer_id: '', therapist_id: '', appointment_date: selectedDate, start_time: '09:00', end_time: '10:00', service_ids: [], notes: '', status: 'pending' });
    setFormError(''); setModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      customer_id: a.customer_id, therapist_id: a.therapist_id ?? '',
      appointment_date: a.appointment_date, start_time: a.start_time, end_time: a.end_time,
      service_ids: (a.appointment_details ?? []).map((d) => d.service_id), notes: a.notes ?? '', status: a.status,
    });
    setFormError(''); setModalOpen(true);
  };

  const checkConflict = async (therapistId: string, date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> => {
    if (!therapistId) return false;
    let query = supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('therapist_id', therapistId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query;
    return (data ?? []).some((a) => {
      return startTime < a.end_time && endTime > a.start_time;
    });
  };

  const save = async () => {
    setFormError('');
    if (!form.customer_id) { setFormError('Vui lòng chọn khách hàng.'); return; }
    if (!form.therapist_id) { setFormError('Vui lòng chọn kỹ thuật viên.'); return; }
    if (form.start_time >= form.end_time) { setFormError('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc.'); return; }
    if (form.service_ids.length === 0) { setFormError('Vui lòng chọn ít nhất một dịch vụ.'); return; }

    const conflict = await checkConflict(form.therapist_id, form.appointment_date, form.start_time, form.end_time, editing?.id);
    if (conflict) { setFormError('Kỹ thuật viên đã có lịch trong khoảng thời gian này. Vui lòng chọn thời gian hoặc nhân viên khác.'); return; }

    setSaving(true);
    const payload = {
      customer_id: form.customer_id, therapist_id: form.therapist_id,
      appointment_date: form.appointment_date, start_time: form.start_time, end_time: form.end_time,
      status: form.status, notes: form.notes || null,
    };
    let aptId = editing?.id;
    if (editing) {
      await supabase.from('appointments').update(payload).eq('id', editing.id);
      await supabase.from('appointment_details').delete().eq('appointment_id', editing.id);
    } else {
      const { data, error } = await supabase.from('appointments').insert(payload).select().single();
      if (error) { setFormError('Không thể tạo lịch hẹn.'); setSaving(false); return; }
      aptId = data.id;
    }
    if (aptId) {
      await supabase.from('appointment_details').insert(form.service_ids.map((sid) => ({ appointment_id: aptId, service_id: sid })));
    }
    setSaving(false); setModalOpen(false); load();
  };

  const advanceStatus = async (a: Appointment) => {
    const next = NEXT_STATUS[a.status];
    if (!next) return;
    await supabase.from('appointments').update({ status: next }).eq('id', a.id);
    load();
  };

  const cancelApt = async (a: Appointment) => {
    if (confirm('Hủy lịch hẹn này?')) {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', a.id);
      load();
    }
  };

  const noShowApt = async (a: Appointment) => {
    await supabase.from('appointments').update({ status: 'no_show' }).eq('id', a.id);
    load();
  };

  // Filtered appointments for views
  const dayAppointments = useMemo(() =>
    appointments.filter((a) => a.appointment_date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, selectedDate]
  );

  const weekAppointments = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const dates: { date: string; items: Appointment[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      dates.push({ date: ds, items: appointments.filter((a) => a.appointment_date === ds).sort((a, b) => a.start_time.localeCompare(b.start_time)) });
    }
    return dates;
  }, [appointments, selectedDate]);

  if (loading) return <div className="p-6"><LoadingState /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Quản lý lịch hẹn" subtitle="Lịch hẹn của khách hàng"
        actions={!isTherapist && <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Tạo lịch hẹn</button>} />

      {/* View toggle + date */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-1 card p-1">
          {(['list', 'day', 'week'] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${view === v ? 'bg-rose-50 text-rose-600' : 'text-charcoal-400 hover:text-charcoal-600'}`}>
              {v === 'list' ? <span className="flex items-center gap-1.5"><List className="w-4 h-4" /> Danh sách</span> :
               v === 'day' ? <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Ngày</span> :
               <span className="flex items-center gap-1.5"><CalIcon className="w-4 h-4" /> Tuần</span>}
            </button>
          ))}
        </div>
        {(view === 'day' || view === 'week') && (
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field max-w-[180px]" />
        )}
      </div>

      {/* List view */}
      {view === 'list' && (
        appointments.length === 0 ? (
          <div className="card"><EmptyState icon={<CalIcon className="w-8 h-8" />} title="Chưa có lịch hẹn" description="Tạo lịch hẹn đầu tiên." /></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-charcoal-100 bg-ivory">
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Ngày</th>
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Giờ</th>
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Khách hàng</th>
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden md:table-cell">Dịch vụ</th>
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden lg:table-cell">Kỹ thuật viên</th>
                    <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Trạng thái</th>
                    <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-50">
                  {appointments.map((a) => (
                    <tr key={a.id} className="table-row-hover">
                      <td className="px-4 py-3 text-sm text-charcoal-600">{formatDate(a.appointment_date)}</td>
                      <td className="px-4 py-3 text-sm text-charcoal-600">{formatTime(a.start_time)} - {formatTime(a.end_time)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-charcoal-700">{a.customer?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-charcoal-500 hidden md:table-cell">{(a.appointment_details ?? []).map((d) => d.service?.name).filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-charcoal-500 hidden lg:table-cell">{a.therapist?.full_name ?? '—'}</td>
                      <td className="px-4 py-3"><span className={`badge ${APPOINTMENT_STATUS_COLORS[a.status]}`}>{APPOINTMENT_STATUS_LABELS[a.status]}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {NEXT_STATUS[a.status] && !isTherapist && (
                            <button onClick={() => advanceStatus(a)} className="p-1.5 text-charcoal-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Chuyển trạng thái tiếp theo">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {isTherapist && a.status === 'in_progress' && (
                            <button onClick={() => advanceStatus(a)} className="p-1.5 text-charcoal-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Hoàn thành">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {!isTherapist && !['completed', 'cancelled', 'no_show'].includes(a.status) && (
                            <button onClick={() => openEdit(a)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Sửa"><CalIcon className="w-4 h-4" /></button>
                          )}
                          {!isTherapist && !['completed', 'cancelled', 'no_show'].includes(a.status) && (
                            <button onClick={() => cancelApt(a)} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Hủy"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Day view */}
      {view === 'day' && (
        <div className="space-y-2">
          <h3 className="font-serif text-lg text-charcoal-700">{formatDate(selectedDate)}</h3>
          {dayAppointments.length === 0 ? (
            <div className="card"><EmptyState icon={<CalIcon className="w-8 h-8" />} title="Không có lịch hẹn" description="Không có lịch hẹn nào trong ngày này." /></div>
          ) : dayAppointments.map((a) => (
            <AppointmentCard key={a.id} a={a} onEdit={!isTherapist ? () => openEdit(a) : undefined} onAdvance={NEXT_STATUS[a.status] ? () => advanceStatus(a) : undefined} onCancel={!isTherapist && !['completed', 'cancelled', 'no_show'].includes(a.status) ? () => cancelApt(a) : undefined} />
          ))}
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekAppointments.map(({ date, items }) => (
            <div key={date} className="card p-3 min-h-[120px]">
              <p className="text-xs font-medium text-charcoal-500 mb-2">{formatDate(date)}</p>
              <div className="space-y-1.5">
                {items.map((a) => (
                  <div key={a.id} className={`p-2 rounded-lg border text-xs ${APPOINTMENT_STATUS_COLORS[a.status]}`}>
                    <p className="font-medium">{formatTime(a.start_time)} {a.customer?.full_name}</p>
                    <p className="opacity-75">{(a.appointment_details ?? []).map((d) => d.service?.name).filter(Boolean).join(', ')}</p>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-charcoal-300 text-center py-2">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa lịch hẹn' : 'Tạo lịch hẹn'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Khách hàng <span className="text-rose-500">*</span></label>
            <select className="input-field" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Chọn khách hàng</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} - {c.phone}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Kỹ thuật viên <span className="text-rose-500">*</span></label>
            <select className="input-field" value={form.therapist_id} onChange={(e) => setForm({ ...form, therapist_id: e.target.value })}>
              <option value="">Chọn kỹ thuật viên</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} {e.specialty ? `(${e.specialty})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Ngày hẹn <span className="text-rose-500">*</span></label>
            <input type="date" className="input-field" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Bắt đầu <span className="text-rose-500">*</span></label>
              <input type="time" className="input-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Kết thúc <span className="text-rose-500">*</span></label>
              <input type="time" className="input-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Dịch vụ <span className="text-rose-500">*</span></label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-charcoal-100 rounded-lg p-3">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer hover:bg-ivory p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => setForm((f) => ({ ...f, service_ids: f.service_ids.includes(s.id) ? f.service_ids.filter((x) => x !== s.id) : [...f.service_ids, s.id] }))} className="rounded border-charcoal-300 text-rose-500 focus:ring-rose-300" />
                  <span className="text-sm text-charcoal-700">{s.name}</span>
                  <span className="text-xs text-charcoal-400 ml-auto">{s.duration} phút</span>
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Ghi chú</label>
            <textarea className="input-field min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú cho lịch hẹn" />
          </div>
          {editing && (
            <div>
              <label className="label-field">Trạng thái</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppointmentStatus })}>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
        </div>
        {formError && (
          <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </Modal>
    </div>
  );
}

function AppointmentCard({ a, onEdit, onAdvance, onCancel }: { a: Appointment; onEdit?: () => void; onAdvance?: () => void; onCancel?: () => void }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-charcoal-700">{formatTime(a.start_time)}</p>
          <p className="text-xs text-charcoal-400">{formatTime(a.end_time)}</p>
        </div>
        <div className="w-px h-10 bg-charcoal-100" />
        <div>
          <p className="text-sm font-medium text-charcoal-700">{a.customer?.full_name ?? '—'}</p>
          <p className="text-xs text-charcoal-400">{(a.appointment_details ?? []).map((d) => d.service?.name).filter(Boolean).join(', ') || 'Chưa có dịch vụ'}</p>
          {a.therapist && <p className="text-xs text-mauve-500 mt-0.5">Kỹ thuật viên: {a.therapist.full_name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${APPOINTMENT_STATUS_COLORS[a.status]}`}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
        {onAdvance && <button onClick={onAdvance} className="p-1.5 text-charcoal-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><CheckCircle2 className="w-4 h-4" /></button>}
        {onEdit && <button onClick={onEdit} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all text-xs">Sửa</button>}
        {onCancel && <button onClick={onCancel} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><X className="w-4 h-4" /></button>}
      </div>
    </div>
  );
}
