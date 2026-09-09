import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Quản lý', email: 'manager@spa.vn', password: 'Manager@123' },
  { label: 'Lễ tân', email: 'receptionist@spa.vn', password: 'Reception@123' },
  { label: 'Kỹ thuật viên', email: 'therapist@spa.vn', password: 'Therapist@123' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const doSignIn = async (em: string, pw: string) => {
    setError('');
    const { error: signInError } = await signIn(em, pw);
    if (signInError) {
      setError(
        'Đăng nhập thất bại. Tài khoản chưa được tạo hoặc mật khẩu không đúng. ' +
        'Vui lòng liên hệ quản trị viên để seed tài khoản demo.'
      );
      return false;
    }
    navigate('/dashboard');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await doSignIn(email, password);
    setLoading(false);
  };

  // Click demo: điền form VÀ đăng nhập luôn
  const handleDemoLogin = async (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setDemoLoading(acc.label);
    await doSignIn(acc.email, acc.password);
    setDemoLoading(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-mauve-100 via-rose-50 to-gold-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-rose-200 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-mauve-200 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-charcoal-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-500" />
            </div>
            <span className="font-serif text-2xl font-semibold">Serene Spa</span>
          </div>
          <h1 className="font-serif text-5xl font-medium leading-tight mb-6">
            Hệ thống quản lý<br />Spa & Chăm sóc sắc đẹp
          </h1>
          <p className="text-lg text-charcoal-500 leading-relaxed max-w-md">
            Giải pháp toàn diện giúp quản lý khách hàng, lịch hẹn, dịch vụ, hóa đơn và trợ lý AI thông minh cho spa của bạn.
          </p>
          <div className="mt-12 space-y-3">
            {['Quản lý khách hàng & lịch hẹn thông minh', 'Trợ lý AI gợi ý dịch vụ & chăm sóc khách hàng', 'Báo cáo doanh thu & hiệu suất nhân viên'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-charcoal-600">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-20 bg-ivory">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-rose-500" />
            </div>
            <span className="font-serif text-xl font-semibold text-charcoal-700">Serene Spa</span>
          </div>

          <h2 className="font-serif text-3xl font-medium text-charcoal-800 mb-2">Đăng nhập</h2>
          <p className="text-charcoal-400 mb-8">Chào mừng bạn quay lại. Vui lòng đăng nhập để tiếp tục.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field" htmlFor="email">Tên đăng nhập</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Nhập tên đăng nhập hoặc email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field" htmlFor="password">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-300" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300 hover:text-charcoal-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-charcoal-500 cursor-pointer">
                <input type="checkbox" className="rounded border-charcoal-300 text-rose-500 focus:ring-rose-300" />
                Ghi nhớ đăng nhập
              </label>
              <button type="button" className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading !== null}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-charcoal-100">
            <p className="text-sm text-charcoal-400 mb-3">Tài khoản demo (bấm để đăng nhập ngay):</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => handleDemoLogin(acc)}
                  disabled={loading || demoLoading !== null}
                  className="px-3 py-2 bg-white border border-charcoal-200 rounded-lg text-sm text-charcoal-600 hover:border-rose-300 hover:bg-rose-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {demoLoading === acc.label
                    ? <><Loader2 className="w-3 h-3 animate-spin" />{acc.label}</>
                    : acc.label
                  }
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
