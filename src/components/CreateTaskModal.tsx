import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';

export const CreateTaskModal = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || loading) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        name: name.trim(),
        url: finalUrl,
        status: 'DESIGNING',
        linkClickCount: 0,
        sapoOrderCode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        designCompletedAt: null,
        sapoOrderedAt: null,
        noOrderAt: null,
        createdByUid: user?.uid,
        createdByName: user?.displayName,
        updatedByUid: user?.uid,
        updatedByName: user?.displayName
      });
      onClose();
    } catch (error) {
      console.error('Lỗi tạo task:', error);
      alert('Không thể tạo task, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-lg transform transition-all">
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-tight">
            Tạo Task
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 text-left">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tên Task
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="Nhập tên task..."
                />
              </div>
              <div>
                <label htmlFor="url" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Link
                </label>
                <input
                  type="text"
                  name="url"
                  id="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="google.com"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={loading || !name.trim() || !url.trim()}
                className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl px-6 py-3 bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : 'Tạo Task'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl border border-slate-200 px-6 py-3 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

