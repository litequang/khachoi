import React, { useState } from 'react';
import { X, User as UserIcon, Lock, Loader2 } from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/auth';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal = ({ onClose }: UserProfileModalProps) => {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let isUpdated = false;

      // Update Display Name
      if (displayName !== (user.displayName || user.username)) {
        await updateProfile(auth.currentUser, { displayName });
        
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { name: displayName });
        
        setUser({ ...user, displayName });
        isUpdated = true;
      }

      // Update Password
      if (newPassword) {
        if (!currentPassword) {
          throw new Error('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới');
        }
        
        if (newPassword.length < 6) {
          throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
        }

        const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        isUpdated = true;
      }

      if (isUpdated) {
        setSuccess('Cập nhật thông tin thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Mật khẩu hiện tại không đúng');
      } else {
        setError(err.message || 'Có lỗi xảy ra khi cập nhật thông tin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" />
            Hồ sơ cá nhân
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-xl border border-emerald-100">
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Tên hiển thị</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                placeholder="Nhập tên hiển thị"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              Đổi mật khẩu (không bắt buộc)
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
