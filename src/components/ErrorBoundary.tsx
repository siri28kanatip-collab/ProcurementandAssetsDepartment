import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import {
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  FirestoreErrorInfo,
} from '../firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  parsedInfo: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    parsedInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    let parsedInfo: FirestoreErrorInfo | null = null;
    try {
      const candidate = JSON.parse(error.message);
      if (candidate && typeof candidate === 'object' && 'operationType' in candidate) {
        parsedInfo = candidate as FirestoreErrorInfo;
      }
    } catch {
      // Not a JSON-serialized FirestoreErrorInfo
    }

    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
      parsedInfo,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '', parsedInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const rawMsg = this.state.parsedInfo?.error || this.state.errorMessage;
      const isFreeTierQuota = rawMsg.includes(
        "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
      );
      const isQuota = isFreeTierQuota || rawMsg.includes('Quota exceeded');
      const isPermissionDenied =
        rawMsg.includes('Missing or insufficient permissions') ||
        rawMsg.includes('permission-denied');

      const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล Firebase
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  {isQuota
                    ? 'โควต้าการใช้งาน Firestore ฟรีประจำวันเต็มแล้ว ระบบจะรีเซ็ตโควต้าในวันถัดไป'
                    : isPermissionDenied
                    ? 'บัญชี Google ที่เข้าสู่ระบบไม่มีสิทธิ์ดำเนินการในส่วนนี้ หรือข้อมูลไม่ผ่านกฎความปลอดภัย'
                    : 'ไม่สามารถดำเนินการกับฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'}
                </p>
              </div>
            </div>

            {this.state.parsedInfo && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-700">
                <div>
                  <span className="font-semibold">การดำเนินการ:</span>{' '}
                  {this.state.parsedInfo.operationType}
                </div>
                {this.state.parsedInfo.path && (
                  <div>
                    <span className="font-semibold">เส้นทางข้อมูล:</span>{' '}
                    {this.state.parsedInfo.path}
                  </div>
                )}
                {this.state.parsedInfo.authInfo?.email && (
                  <div>
                    <span className="font-semibold">บัญชีที่เชื่อมต่อ:</span>{' '}
                    {this.state.parsedInfo.authInfo.email}
                  </div>
                )}
              </div>
            )}

            {isFreeTierQuota && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
              >
                <span>ตรวจสอบและอัปเกรดแผนการใช้งาน Firestore</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>โหลดหน้าใหม่</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
