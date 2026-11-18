import React, { useState, useEffect, useCallback } from 'react';
import { ProjectItem, AuthUser } from './types/project';
import {
  PROJECTS_COLLECTION,
  subscribeToProjects,
  fetchProjects,
  saveProject,
  removeProject,
  bulkSaveProjects,
} from './services/api';
import { useFirebase } from './components/FirebaseProvider';
import { LoginScreen } from './components/LoginModal';
import { SummaryReport } from './components/SummaryReport';
import { ProjectTableView } from './components/ProjectTableView';
import { ProjectFormModal } from './components/ProjectFormModal';
import { ExcelManagerModal } from './components/ExcelManagerModal';
import { ExcelManagerPage } from './components/ExcelManagerPage';
import { OfficialMemoReport } from './components/OfficialMemoReport';
import {
  Building2,
  FileSpreadsheet,
  FileText,
  PieChart,
  ListOrdered,
  LogOut,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const {
    firebaseUser,
    isAuthReady,
    isSigningIn,
    authError,
    signInWithGoogle,
  } = useFirebase();

  // Current authenticated role state (from sessionStorage)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('mhk_auth_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Active navigation view: 'summary' | 'projects' | 'excel' | 'memo'
  const [activeView, setActiveView] = useState<'summary' | 'projects' | 'excel' | 'memo'>('summary');

  // Selected fiscal year: '2570' | 'ก่อนปี 2570' | 'all'
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<'2570' | 'ก่อนปี 2570' | 'all'>('2570');

  // Projects list state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [fatalError, setFatalError] = useState<Error | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Manual refresh from Firestore
  const loadData = useCallback(async () => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    setIsSyncing(true);
    try {
      const data = await fetchProjects(firebaseUser);
      setProjects(data);
      const timeStr = new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncTime(timeStr);
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [firebaseUser]);

  // Attach real-time Firestore onSnapshot listener only when Auth is ready and user is authenticated
  useEffect(() => {
    if (!currentUser || !isAuthReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToProjects(
      firebaseUser,
      (items) => {
        setProjects(items);
        const timeStr = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncTime(timeStr);
        setIsLoading(false);
        setIsSyncing(false);
      },
      (err) => {
        setIsLoading(false);
        setFatalError(err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isAuthReady, firebaseUser]);

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('mhk_auth_user');
    setCurrentUser(null);
    setProjects([]);
    setActiveView('summary');
  };

  // Handle Project Save (Create / Update)
  const handleSaveProject = async (project: ProjectItem, isNew: boolean) => {
    try {
      await saveProject(project, isNew, editingProject);
      if (isNew) {
        showToast(`บันทึกโครงการ "${project.name}" ลง Firebase เรียบร้อยแล้ว`);
      } else {
        showToast(`แก้ไขข้อมูลโครงการ "${project.name}" ใน Firebase เรียบร้อยแล้ว`);
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Handle Project Delete
  const handleDeleteProject = async (id: string, name: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโครงการ:\n"${name}"\nออกจากฐานข้อมูล Firebase?`)) {
      try {
        await removeProject(id);
        showToast(`ลบโครงการ "${name}" ออกจากฐานข้อมูลเรียบร้อยแล้ว`);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  // Handle Bulk Excel Import
  const handleImportComplete = async (importedProjects: ProjectItem[], mode: 'append' | 'replace') => {
    try {
      const updated = await bulkSaveProjects(importedProjects, mode);
      setProjects(updated);
      showToast(
        mode === 'replace'
          ? `แทนที่ฐานข้อมูลด้วยไฟล์ Excel เรียบร้อยแล้ว (${updated.length} รายการ)`
          : `นำเข้าข้อมูลต่อท้ายเรียบร้อยแล้ว (${importedProjects.length} รายการ)`
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const isExecutive = currentUser?.role === 'executive';

  // Ensure Executive cannot remain on restricted views
  useEffect(() => {
    if (isExecutive && (activeView === 'excel' || activeView === 'memo')) {
      setActiveView('summary');
    }
  }, [isExecutive, activeView]);

  if (fatalError) {
    throw fatalError;
  }

  // IF NOT AUTHENTICATED -> ALWAYS SHOW LOGIN SCREEN AS SPECIFIED
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveView('summary');
        }}
      />
    );
  }

  // If role session exists from sessionStorage but Firebase Google Auth is not yet connected
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 font-sans">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-600">
          กำลังเตรียมการเชื่อมต่อฐานข้อมูล Firebase...
        </p>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">เชื่อมต่อบัญชี Google (Firebase)</h2>
              <p className="text-xs text-slate-400">
                ฐานข้อมูล: {PROJECTS_COLLECTION}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            กรุณาเชื่อมต่อบัญชี Google ที่ยืนยันอีเมลแล้ว เพื่อรับสิทธิ์อ่านและบันทึกข้อมูลแบบเรียลไทม์กับฐานข้อมูล Firebase
          </p>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => signInWithGoogle()}
              disabled={isSigningIn}
              className="flex-1 py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {isSigningIn ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี Google'}
            </button>
            <button
              onClick={handleLogout}
              className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition cursor-pointer"
            >
              กลับหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Zone */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <span>เทศบาลเมืองมหาสารคาม</span>
                  <span className="text-[11px] font-normal text-amber-300/80 bg-slate-800 px-2 py-0.5 rounded">
                    ปี ๒๕๗๐
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  ฝ่ายพัสดุและทรัพย์สิน กองคลัง
                </div>
              </div>
            </div>

            {/* Navigation Switcher */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setActiveView('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeView === 'summary'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>รายงานสรุป ๖ แหล่งเงิน</span>
              </button>

              <button
                onClick={() => setActiveView('projects')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeView === 'projects'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>บัญชีรายการงบลงทุน</span>
              </button>

              {!isExecutive && (
                <>
                  <button
                    onClick={() => setActiveView('excel')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      activeView === 'excel'
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'text-emerald-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>ระบบดาวน์โหลดและนำเข้า Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => setActiveView('memo')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      activeView === 'memo'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>บันทึกข้อความราชการ</span>
                  </button>
                </>
              )}
            </nav>

            {/* Right Action & User Profile Zone */}
            <div className="flex items-center gap-3 shrink-0">
              {!isExecutive && (
                <button
                  onClick={() => setActiveView('excel')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs"
                  title="เปิดเมนูระบบดาวน์โหลดและนำเข้าข้อมูลเป็น Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>เมนู Excel</span>
                </button>
              )}

              {/* User Role Badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-amber-300/90 truncate max-w-[140px]">
                    {currentUser.displayName}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center text-indigo-300 text-xs font-bold">
                  {currentUser.role === 'officer' ? 'US' : currentUser.role === 'director' ? 'DIR' : 'EXE'}
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="ออกจากระบบ (กลับหน้า Login)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900/95 py-2 px-2 text-xs">
          <button
            onClick={() => setActiveView('summary')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md ${
              activeView === 'summary' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>รายงานสรุป</span>
          </button>
          <button
            onClick={() => setActiveView('projects')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md ${
              activeView === 'projects' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>บัญชีโครงการ</span>
          </button>
          {!isExecutive && (
            <>
              <button
                onClick={() => setActiveView('excel')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                  activeView === 'excel' ? 'bg-emerald-600 text-white' : 'text-emerald-400 font-medium'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ระบบ Excel</span>
              </button>
              <button
                onClick={() => setActiveView('memo')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                  activeView === 'memo' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>บันทึกข้อความ</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Sub-bar: Firebase database connection & quick refresh */}
      <div className="no-print bg-white border-b border-slate-200 py-1.5 px-4 sm:px-6 lg:px-8 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium text-slate-700">
              ฐานข้อมูล Firebase ({PROJECTS_COLLECTION}):
            </span>
            <span>ซิงค์ข้อมูลเรียลไทม์ ({projects.length} โครงการในระบบ)</span>
            {isSyncing && (
              <span className="text-indigo-600 flex items-center gap-1 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                กำลังซิงค์ข้อมูล...
              </span>
            )}
            {!isSyncing && lastSyncTime && (
              <span className="text-slate-400">· อัปเดตล่าสุด {lastSyncTime}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              ผู้ใช้งาน: <strong className="text-slate-900">{currentUser.displayName}</strong>{' '}
              <span className="text-slate-400">({firebaseUser.email})</span>
            </span>
            <button
              onClick={loadData}
              className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
              title="ดึงข้อมูลล่าสุดจาก Firebase"
            >
              <RefreshCw className="w-3 h-3" />
              <span>รีเฟรชฐานข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium text-slate-600">
              กำลังเชื่อมต่อฐานข้อมูล Firebase ({PROJECTS_COLLECTION})...
            </p>
          </div>
        ) : (
          <>
            {/* View 1: Summary Report */}
            {activeView === 'summary' && (
              <SummaryReport
                projects={projects}
                selectedFiscalYear={selectedFiscalYear}
                onSelectFiscalYear={(fy) => setSelectedFiscalYear(fy)}
                onFilterBySource={() => {
                  setActiveView('projects');
                }}
                showExcelExport={!isExecutive}
              />
            )}

            {/* View 2: Project Table View */}
            {activeView === 'projects' && (
              <ProjectTableView
                projects={projects}
                currentUser={currentUser}
                selectedFiscalYear={selectedFiscalYear}
                onSelectFiscalYear={(fy) => setSelectedFiscalYear(fy)}
                onAddNewProject={() => {
                  setEditingProject(null);
                  setIsFormModalOpen(true);
                }}
                onEditProject={(p) => {
                  setEditingProject(p);
                  setIsFormModalOpen(true);
                }}
                onDeleteProject={handleDeleteProject}
                onOpenExcelModal={() => setActiveView('excel')}
              />
            )}

            {/* View 3: Dedicated Excel Manager Page */}
            {!isExecutive && activeView === 'excel' && (
              <ExcelManagerPage
                projects={projects}
                onImportComplete={handleImportComplete}
                onNavigateToProjects={() => setActiveView('projects')}
              />
            )}

            {/* View 4: Official Memorandum Report */}
            {!isExecutive && activeView === 'memo' && (
              <OfficialMemoReport
                projects={projects}
                selectedFiscalYear={selectedFiscalYear}
                onBack={() => setActiveView('projects')}
              />
            )}
          </>
        )}
      </main>

      {/* Project Form Modal (Daily entry / edit) */}
      <ProjectFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        initialProject={editingProject}
        currentUser={currentUser}
      />

      {/* Excel Import / Export Modal */}
      {!isExecutive && (
        <ExcelManagerModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          projects={projects}
          onImportComplete={handleImportComplete}
          selectedFiscalYear={selectedFiscalYear}
        />
      )}

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © ๒๕๗๐ ฝ่ายพัสดุและทรัพย์สิน กองคลัง เทศบาลเมืองมหาสารคาม จังหวัดมหาสารคาม
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ พ.ศ. ๒๕๖๐</span>
            <span>·</span>
            <span>โทร. ๐-๔๓๗๑-๑๑๗๘</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
