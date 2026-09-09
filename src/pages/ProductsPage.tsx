import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Boxes, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, PRODUCT_CATEGORIES } from '@/utils/labels';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState, { LoadingState } from '@/components/EmptyState';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%,supplier.ilike.%${debouncedSearch}%`);
    const { data } = await query;
    setProducts(data as Product[] ?? []);
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ status: 'active', sale_price: 0, cost_price: 0, stock_quantity: 0, category: PRODUCT_CATEGORIES[0] }); setFormError(''); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm(p); setFormError(''); setModalOpen(true); };

  const save = async () => {
    setFormError('');
    if (!form.name?.trim()) { setFormError('Vui lòng nhập tên sản phẩm.'); return; }
    if (form.sale_price === undefined || form.sale_price < 0) { setFormError('Giá bán không được nhỏ hơn 0.'); return; }
    if (form.cost_price === undefined || form.cost_price < 0) { setFormError('Giá nhập không được nhỏ hơn 0.'); return; }
    if (form.stock_quantity === undefined || form.stock_quantity < 0) { setFormError('Tồn kho không được nhỏ hơn 0.'); return; }
    setSaving(true);
    const payload = {
      name: form.name, description: form.description || null,
      sale_price: form.sale_price, cost_price: form.cost_price,
      stock_quantity: form.stock_quantity, category: form.category || null,
      supplier: form.supplier || null, status: form.status ?? 'active',
    };
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { setFormError(error.code === '23505' ? 'Tên sản phẩm đã tồn tại.' : 'Không thể cập nhật.'); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { setFormError(error.code === '23505' ? 'Tên sản phẩm đã tồn tại.' : 'Không thể tạo sản phẩm.'); setSaving(false); return; }
    }
    setSaving(false); setModalOpen(false); load();
  };

  const remove = async (p: Product) => { if (confirm(`Xóa sản phẩm "${p.name}"?`)) { await supabase.from('products').delete().eq('id', p.id); load(); } };

  const lowStockProducts = products.filter((p) => p.stock_quantity <= 10);

  return (
    <div className="p-6">
      <PageHeader title="Quản lý sản phẩm" subtitle="Quản lý kho và sản phẩm"
        actions={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm sản phẩm</button>} />

      {lowStockProducts.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">Sản phẩm sắp hết hàng</p>
            <p className="text-xs text-amber-600">{lowStockProducts.map((p) => p.name).join(', ')} ({lowStockProducts.length} sản phẩm có tồn kho ≤ 10)</p>
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Tìm sản phẩm theo tên, danh mục hoặc nhà cung cấp..." />
        </div>
      </div>

      {loading ? <LoadingState /> : products.length === 0 ? (
        <div className="card"><EmptyState icon={<Boxes className="w-8 h-8" />} title="Chưa có sản phẩm" description="Thêm sản phẩm đầu tiên." action={<button onClick={openAdd} className="btn-primary">Thêm sản phẩm</button>} /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal-100 bg-ivory">
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Tên sản phẩm</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden md:table-cell">Danh mục</th>
                  <th className="text-left text-xs font-medium text-charcoal-400 uppercase px-4 py-3 hidden lg:table-cell">Nhà cung cấp</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Giá bán</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Tồn kho</th>
                  <th className="text-right text-xs font-medium text-charcoal-400 uppercase px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {products.map((p) => (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="font-medium text-charcoal-700">{p.name}</div>
                      <div className="text-xs text-charcoal-400">{p.description ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-600 hidden md:table-cell">{p.category ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal-600 hidden lg:table-cell">{p.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-charcoal-700 text-right">{formatCurrency(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge ${p.stock_quantity <= 10 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{p.stock_quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-charcoal-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(p)} className="p-1.5 text-charcoal-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label-field">Tên sản phẩm <span className="text-rose-500">*</span></label>
            <input className="input-field" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên sản phẩm" />
          </div>
          <div className="md:col-span-2">
            <label className="label-field">Mô tả</label>
            <textarea className="input-field min-h-[70px]" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sản phẩm" />
          </div>
          <div>
            <label className="label-field">Giá bán (VNĐ) <span className="text-rose-500">*</span></label>
            <input type="number" min={0} className="input-field" value={form.sale_price ?? 0} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Giá nhập (VNĐ) <span className="text-rose-500">*</span></label>
            <input type="number" min={0} className="input-field" value={form.cost_price ?? 0} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Tồn kho <span className="text-rose-500">*</span></label>
            <input type="number" min={0} className="input-field" value={form.stock_quantity ?? 0} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label-field">Danh mục</label>
            <select className="input-field" value={form.category ?? PRODUCT_CATEGORIES[0]} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Nhà cung cấp</label>
            <input className="input-field" value={form.supplier ?? ''} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nhập nhà cung cấp" />
          </div>
          <div>
            <label className="label-field">Trạng thái</label>
            <select className="input-field" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Product['status'] })}>
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
