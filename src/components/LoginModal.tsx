import React, { useState } from 'react';
import { AuthUser, UserRole } from '../types/project';
import { Lock, UserCheck, Building2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedUser = username.trim();

    let role: UserRole | null = null;
    let displayName = '';
    let positionTitle = '';

    if (trimmedUser === 'User' && password === '1234') {
      role = 'officer';
      displayName = 'เจ้าหน้าที่พัสดุและทรัพย์สิน';
      positionTitle = 'เจ้าหน้าที่ฝ่ายพัสดุและทรัพย์สิน';
    } else if (trimmedUser === 'Director' && password === '1234') {
      role = 'director';
      displayName = 'ผู้อำนวยการกองคลัง';
      positionTitle = 'ผู้อำนวยการกองคลัง เทศบาลเมืองมหาสารคาม';
    } else if (trimmedUser === 'Executive' && password === '1234') {
      role = 'executive';
      displayName = 'ผู้บริหาร (นายกเทศมนตรี)';
      positionTitle = 'นายกเทศมนตรีเมืองมหาสารคาม';
    }

    setTimeout(() => {
      setIsLoading(false);
      if (role) {
        const user: AuthUser = {
          username: trimmedUser as AuthUser['username'],
          role,
          displayName,
          positionTitle,
        };
        sessionStorage.setItem('mhk_auth_user', JSON.stringify(user));
        localStorage.setItem('mhk_last_user', trimmedUser);
        onLoginSuccess(user);
      } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Emblem & Organization Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-white/10 shadow-xl mb-4 backdrop-blur-md">
            <Building2 className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            เทศบาลเมืองมหาสารคาม
          </h1>
          <p className="text-sm font-medium text-amber-300/90 mt-1">
            ฝ่ายพัสดุและทรัพย์สิน กองคลัง
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span>ระบบรายงานผลการดำเนินงานงบลงทุน ประจำปีงบประมาณ ๒๕๗๐</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">เข้าสู่ระบบการทำงาน</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              กรุณาระบุชื่อผู้ใช้งานและรหัสผ่านเพื่อเข้าใช้งานระบบ
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">เข้าสู่ระบบไม่สำเร็จ</p>
                <p className="mt-0.5 text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ระบุชื่อผู้ใช้งาน"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่าน"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:text-indigo-400 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-md hover:shadow-indigo-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>กำลังตรวจสอบสิทธิ์...</span>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500">
          เทศบาลเมืองมหาสารคาม จังหวัดมหาสารคาม · โทร. 0-4371-1178
        </div>
      </div>
    </div>
  );
};
