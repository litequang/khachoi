import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, firebaseConfig } from '../lib/firebase';
import { User, Role } from '../types';
import { UserPlus, Shield, ShieldOff, CheckCircle2, XCircle } from 'lucide-react';

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('DESIGNER');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !password || actionLoading) return;

    setCreateError('');
    setActionLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      
      const normalizedUsername = username.trim().toLowerCase();
      // Check if username exists
      const existingUser = users.find(u => u.username === normalizedUsername);
      if (existingUser) {
        throw new Error("Tài khoản (username) đã tồn tại!");
      }

      const email = `${normalizedUsername}@task.local`;
      
      // Initialize secondary app
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      let newUid = "";
      try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          newUid = userCredential.user.uid;
      } catch (authError: any) {
          throw new Error("Lỗi Firebase Auth: " + authError.message);
      } finally {
          await deleteApp(secondaryApp);
      }
      
      // Write profile to Firestore using the main app (with ADMIN privileges)
      try {
          await setDoc(doc(db, 'users', newUid), {
              username: normalizedUsername,
              displayName: displayName.trim(),
              role,
              active: true,
              createdAt: serverTimestamp(),
              createdByUid: currentUser.uid
          });
      } catch (dbError: any) {
          throw new Error("Tạo Auth thành công nhưng lỗi lưu DB. Vui lòng báo kỹ thuật. " + dbError.message);
      }

      setIsCreateModalOpen(false);
      setDisplayName('');
      setUsername('');
      setPassword('');
      setRole('DESIGNER');
    } catch (error: any) {
      console.error("Lỗi tạo user:", error);
      setCreateError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserActive = async (user: User) => {
    if (user.role === 'ADMIN') {
        alert("Không thể thay đổi trạng thái của Admin từ UI này.");
        return;
    }
    
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        active: !user.active
      });
    } catch (error) {
      console.error("Lỗi thay đổi trạng thái user:", error);
      alert("Lỗi khi cập nhật.");
    } finally {
      setActionLoading(false);
    }
  };

  const changeUserRole = async (user: User) => {
      if (user.role === 'ADMIN') return;
      if (actionLoading) return;
      
      const newRole = user.role === 'DESIGNER' ? 'SALE' : 'DESIGNER';
      setActionLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          role: newRole
        });
      } catch (error) {
        console.error("Lỗi đổi role:", error);
        alert("Lỗi khi cập nhật.");
      } finally {
        setActionLoading(false);
      }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Đang tải...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Quản lý người dùng</h3>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Tạo người dùng
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài khoản</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.uid}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {u.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {u.role === 'ADMIN' ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                         Quản trị
                       </span>
                   ) : (
                       <button
                         onClick={() => changeUserRole(u)}
                         disabled={actionLoading}
                         className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'DESIGNER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} hover:opacity-80 cursor-pointer disabled:opacity-50`}
                       >
                         {u.role === 'DESIGNER' ? 'Thiết kế' : 'Sale'}
                         <span className="ml-1 text-[10px] opacity-60">(Đổi)</span>
                       </button>
                   )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.active ? (
                    <span className="inline-flex items-center text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-600">
                      <XCircle className="w-4 h-4 mr-1" />
                      Đã khóa
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => toggleUserActive(u)}
                      disabled={actionLoading}
                      className={`text-${u.active ? 'red' : 'green'}-600 hover:text-${u.active ? 'red' : 'green'}-900 disabled:opacity-50 inline-flex items-center`}
                    >
                      {u.active ? <><ShieldOff className="w-4 h-4 mr-1"/> Khóa</> : <><Shield className="w-4 h-4 mr-1"/> Mở khóa</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-lg transform transition-all">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-tight">
                Tạo người dùng
              </h3>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-5 text-left">
                  {createError && (
                    <div className="text-red-500 text-sm font-bold bg-red-50 border border-red-100 p-3 rounded-xl">
                      {createError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Tên hiển thị</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Tài khoản</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Mật khẩu</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Vai trò</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    >
                      <option value="DESIGNER">Thiết kế</option>
                      <option value="SALE">Sale</option>
                    </select>
                  </div>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading || !displayName.trim() || !username.trim() || !password}
                    className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl px-6 py-3 bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
                  >
                    {actionLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl border border-slate-200 px-6 py-3 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

