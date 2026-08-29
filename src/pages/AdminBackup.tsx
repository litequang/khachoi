import React, { useState } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task } from '../types';
import { Download, Upload } from 'lucide-react';

export const AdminBackup = () => {
  const [loading, setLoading] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    tasks: Task[];
    backupAt: string;
    total: number;
    designing: number;
    waiting: number;
    sapo: number;
    noOrder: number;
  } | null>(null);

  const handleExportBackup = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'tasks'));
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupData = {
        app: "Task Công Việc",
        version: 1,
        backupAt: new Date().toISOString(),
        tasks
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `task-cong-viec-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi xuất backup:", error);
      alert("Xuất dữ liệu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (data.app !== "Task Công Việc" || data.version !== 1 || !Array.isArray(data.tasks)) {
          throw new Error("Định dạng file không hợp lệ.");
        }

        const tasks = data.tasks;
        setRestorePreview({
          tasks,
          backupAt: data.backupAt,
          total: tasks.length,
          designing: tasks.filter((t: any) => t.status === 'DESIGNING').length,
          waiting: tasks.filter((t: any) => t.status === 'WAITING_DEPOSIT').length,
          sapo: tasks.filter((t: any) => t.status === 'SAPO_ORDERED').length,
          noOrder: tasks.filter((t: any) => t.status === 'NO_ORDER').length,
        });
      } catch (error) {
        console.error("Parse error:", error);
        alert("File backup không hợp lệ.\nDữ liệu hiện tại chưa bị thay đổi.");
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleRestore = async () => {
    if (!restorePreview || loading) return;
    setLoading(true);

    try {
      // Chunk batches as Firestore has a 500 limit per batch
      const chunks = [];
      let currentChunk = [];
      
      for (const task of restorePreview.tasks) {
        currentChunk.push(task);
        if (currentChunk.length === 450) {
          chunks.push(currentChunk);
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) chunks.push(currentChunk);

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((taskData: any) => {
          const { id, ...data } = taskData;
          
          // Re-hydrate timestamps correctly
          const hydratedData: any = { ...data };
          
          const fields = ['createdAt', 'updatedAt', 'designCompletedAt', 'sapoOrderedAt', 'noOrderAt'];
          fields.forEach(field => {
            if (hydratedData[field] && typeof hydratedData[field] === 'object' && hydratedData[field].seconds) {
              // Convert plain object back to Firestore Timestamp format if needed, or leave as is if the SDK handles it
              // We'll trust the set operation with the exact backup object. If it fails, we construct Timestamp.
              // For simplicity, we just pass the object, firestore often accepts plain objects matching {seconds, nanoseconds}.
            }
          });

          batch.set(doc(db, 'tasks', id), hydratedData, { merge: false }); // merge: false to fully overwrite
        });
        await batch.commit();
      }

      alert("Phục hồi dữ liệu thành công!");
      setRestorePreview(null);
    } catch (error) {
      console.error("Lỗi phục hồi:", error);
      alert("Phục hồi dữ liệu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Dữ liệu hệ thống</h3>
      
      <div className="space-y-8">
        {/* Export */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Xuất Backup</h4>
            <p className="text-sm text-gray-500 mt-1">Tải xuống toàn bộ dữ liệu Task hiện tại dưới dạng file JSON.</p>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={loading}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Tải Backup
          </button>
        </div>

        {/* Import */}
        <div className="p-4 border border-gray-100 rounded-lg">
           <div>
            <h4 className="text-sm font-medium text-gray-900">Phục hồi Backup</h4>
            <p className="text-sm text-gray-500 mt-1 mb-4">Khôi phục dữ liệu từ file backup JSON. Quá trình này sẽ ghi đè các Task bị trùng ID.</p>
          </div>
          
          {!restorePreview ? (
            <div>
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-gray-400" />
                Chọn file JSON
                <input type="file" accept=".json" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
              <h5 className="text-sm font-medium text-yellow-800 mb-3">Xác nhận phục hồi dữ liệu</h5>
              <div className="text-sm text-yellow-700 space-y-1 mb-4">
                <p><strong>Ngày backup:</strong> {new Date(restorePreview.backupAt).toLocaleString('vi-VN')}</p>
                <p><strong>Tổng Task:</strong> {restorePreview.total}</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Đang thiết kế: {restorePreview.designing}</li>
                  <li>Đợi cọc: {restorePreview.waiting}</li>
                  <li>Đã lên Sapo: {restorePreview.sapo}</li>
                  <li>Đuổi khách: {restorePreview.noOrder}</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Đang phục hồi...' : 'Phục hồi dữ liệu'}
                </button>
                <button
                  onClick={() => setRestorePreview(null)}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

