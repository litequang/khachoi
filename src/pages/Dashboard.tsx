import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Task } from '../types';
import { 
  ExternalLink, 
  Check, 
  Ban, 
  FileText, 
  BarChart3, 
  Clock, 
  LayoutDashboard, 
  Copy, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Database, 
  Activity, 
  HardDrive, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles,
  List,
  Grid2x2,
  Grid3x3,
  Eye,
  User
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sapoModalOpen, setSapoModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sapoCode, setSapoCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Task['status']>('DESIGNING');
  const [rejectTask, setRejectTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid2' | 'grid3'>('list');

  // Search & Pagination controls for SAPO_ORDERED and NO_ORDER tabs
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Firebase Usage collapsible panel in sidebar
  const [showFirebaseUsage, setShowFirebaseUsage] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi lấy danh sách task:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Reset pagination when changing tab or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, pageSize]);

  const getMs = (ts: any) => ts?.toMillis ? ts.toMillis() : (ts?.seconds ? ts.seconds * 1000 : 0);

  // 1. Tab Đang thiết kế: sắp xếp từ cũ -> mới (ưu tiên làm trước)
  const designingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'DESIGNING')
      .sort((a, b) => getMs(a.createdAt || a.updatedAt) - getMs(b.createdAt || b.updatedAt));
  }, [tasks]);

  // 2. Tab Đợi cọc: sắp xếp từ CŨ -> MỚI (ưu tiên xử lý khách đã hoàn thành thiết kế từ lâu)
  const waitingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'WAITING_DEPOSIT')
      .sort((a, b) => getMs(a.designCompletedAt || a.updatedAt) - getMs(b.designCompletedAt || b.updatedAt));
  }, [tasks]);

  // 3. Tab Đã lên đơn Sapo: sắp xếp từ MỚI -> CŨ (đơn mới lên nằm ở trên cùng)
  const allSapoTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'SAPO_ORDERED')
      .sort((a, b) => getMs(b.sapoOrderedAt || b.updatedAt) - getMs(a.sapoOrderedAt || a.updatedAt));
  }, [tasks]);

  // 4. Tab Đuổi khách: sắp xếp từ MỚI -> CŨ (khách vừa đuổi nằm ở trên cùng)
  const allNoOrderTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'NO_ORDER')
      .sort((a, b) => getMs(b.noOrderAt || b.updatedAt) - getMs(a.noOrderAt || a.updatedAt));
  }, [tasks]);

  // Search filtering for SAPO and NO_ORDER tabs
  const filteredSapoTasks = useMemo(() => {
    if (!searchTerm.trim()) return allSapoTasks;
    const term = searchTerm.trim().toLowerCase();
    return allSapoTasks.filter(t => 
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.sapoOrderCode && t.sapoOrderCode.toLowerCase().includes(term)) ||
      (t.updatedByName && t.updatedByName.toLowerCase().includes(term)) ||
      (t.createdByName && t.createdByName.toLowerCase().includes(term))
    );
  }, [allSapoTasks, searchTerm]);

  const filteredNoOrderTasks = useMemo(() => {
    if (!searchTerm.trim()) return allNoOrderTasks;
    const term = searchTerm.trim().toLowerCase();
    return allNoOrderTasks.filter(t => 
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.sapoOrderCode && t.sapoOrderCode.toLowerCase().includes(term)) ||
      (t.updatedByName && t.updatedByName.toLowerCase().includes(term)) ||
      (t.createdByName && t.createdByName.toLowerCase().includes(term))
    );
  }, [allNoOrderTasks, searchTerm]);

  // Pagination for SAPO
  const paginatedSapoTasks = useMemo(() => {
    if (pageSize === 0) return filteredSapoTasks;
    const start = (currentPage - 1) * pageSize;
    return filteredSapoTasks.slice(start, start + pageSize);
  }, [filteredSapoTasks, currentPage, pageSize]);

  // Pagination for NO_ORDER
  const paginatedNoOrderTasks = useMemo(() => {
    if (pageSize === 0) return filteredNoOrderTasks;
    const start = (currentPage - 1) * pageSize;
    return filteredNoOrderTasks.slice(start, start + pageSize);
  }, [filteredNoOrderTasks, currentPage, pageSize]);

  const totalClicks = tasks.reduce((sum, task) => sum + (task.linkClickCount || 0), 0);

  const handleOpenLink = async (task: Task) => {
    let finalUrl = task.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');

    if (user?.role === 'DESIGNER') {
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          linkClickCount: increment(1),
          updatedAt: serverTimestamp(),
          updatedByUid: user.uid,
          updatedByName: user.displayName
        });
      } catch (error) {
        console.error("Lỗi cập nhật click:", error);
      }
    }
  };

  const handleUpdateStatus = async (task: Task, newStatus: Task['status']) => {
    if (actionLoading) return;
    
    if (newStatus === 'NO_ORDER') {
      setRejectTask(task);
      return;
    }

    setActionLoading(true);
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedByUid: user?.uid,
        updatedByName: user?.displayName
      };

      if (newStatus === 'WAITING_DEPOSIT') {
        updates.designCompletedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'tasks', task.id), updates);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTask || actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'tasks', rejectTask.id), {
        status: 'NO_ORDER',
        updatedAt: serverTimestamp(),
        updatedByUid: user?.uid,
        updatedByName: user?.displayName,
        noOrderAt: serverTimestamp()
      });
      setRejectTask(null);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSapoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !sapoCode.trim() || actionLoading) return;

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        status: 'SAPO_ORDERED',
        sapoOrderCode: sapoCode.trim(),
        sapoOrderedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedByUid: user?.uid,
        updatedByName: user?.displayName
      });
      setSapoModalOpen(false);
      setSapoCode('');
      setSelectedTask(null);
    } catch (error) {
      console.error("Lỗi lưu đơn Sapo:", error);
      alert("Lưu thất bại.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Chưa cập nhật';
    const ms = timestamp?.toMillis ? timestamp.toMillis() : (timestamp?.seconds ? timestamp.seconds * 1000 : null);
    if (!ms) return 'Chưa cập nhật';
    
    const date = new Date(ms);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const renderTaskCard = (task: Task) => {
    const isGrid = viewMode !== 'list';
    
    return (
      <div key={task.id} className={`bg-white/60 border border-white/40 backdrop-blur-sm p-4 rounded-2xl flex flex-col ${isGrid ? '' : 'sm:flex-row sm:items-center'} justify-between hover:border-blue-300 transition-colors shadow-sm gap-4`}>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-800 truncate" title={task.name}>{task.name}</h3>
            {task.status === 'WAITING_DEPOSIT' && (
               <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-md border border-yellow-200 uppercase whitespace-nowrap">
                 Đợi cọc
               </span>
            )}
            {task.status === 'SAPO_ORDERED' && (
               <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md border border-green-200 uppercase whitespace-nowrap">
                 Sapo: {task.sapoOrderCode}
               </span>
            )}
            {task.status === 'NO_ORDER' && (
               <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md border border-red-200 uppercase whitespace-nowrap">
                 Đuổi khách
               </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            <button 
              onClick={() => handleOpenLink(task)}
              title="Mở Link thiết kế"
              className="text-blue-600 hover:bg-blue-50 p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ExternalLink className="w-4 h-4" />
              {!isGrid && <span>Mở link</span>}
            </button>
            
            <div className="flex items-center gap-1 text-slate-500 text-xs" title={`Số lần mở: ${task.linkClickCount || 0}`}>
              <Eye className="w-3.5 h-3.5" />
              <span className="font-bold text-slate-700">{task.linkClickCount || 0}</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 text-xs" title={`Người tạo: ${task.createdByName || 'admin'}`}>
              <User className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px] font-medium">{task.createdByName || 'admin'}</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 text-xs" title={`Cập nhật cuối: ${formatTime(task.updatedAt)} bởi ${task.updatedByName || 'admin'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px] font-medium">{task.updatedByName || 'admin'}</span>
              <span className="text-[10px] opacity-60 hidden sm:inline ml-0.5">{formatTime(task.updatedAt).split(' ')[1]}</span>
            </div>
          </div>
        </div>

        <div className={`flex gap-2 shrink-0 ${isGrid ? 'w-full grid grid-cols-2' : 'self-start sm:self-center'}`}>
          {task.status === 'DESIGNING' && (
            <>
              <button 
                onClick={() => handleUpdateStatus(task, 'NO_ORDER')}
                disabled={actionLoading}
                className={`px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all border border-slate-200 disabled:opacity-50 whitespace-nowrap ${isGrid ? 'w-full' : ''}`}
              >
                Đuổi khách
              </button>
              <button 
                onClick={() => handleUpdateStatus(task, 'WAITING_DEPOSIT')}
                disabled={actionLoading}
                className={`px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50 whitespace-nowrap ${isGrid ? 'w-full' : ''}`}
              >
                ✓ Hoàn thành
              </button>
            </>
          )}

          {task.status === 'WAITING_DEPOSIT' && (
            <>
              <button 
                onClick={() => handleUpdateStatus(task, 'NO_ORDER')}
                disabled={actionLoading}
                className={`px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all border border-slate-200 disabled:opacity-50 whitespace-nowrap ${isGrid ? 'w-full' : ''}`}
              >
                Đuổi khách
              </button>
              <button 
                onClick={() => {
                  setSelectedTask(task);
                  setSapoModalOpen(true);
                }}
                disabled={actionLoading}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 flex justify-center items-center whitespace-nowrap ${isGrid ? 'w-full' : ''}`}
              >
                <FileText className="w-3 h-3 mr-1" />
                Lên đơn
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-10 bg-gray-50/80 rounded-2xl border border-gray-200 border-dashed">
      <p className="text-gray-500 text-sm font-medium">{message}</p>
    </div>
  );

  // Pagination & Filter Toolbar Component for SAPO and NO_ORDER tabs
  const renderFilterAndPagination = (totalItems: number) => {
    const totalPages = pageSize === 0 ? 1 : Math.ceil(totalItems / pageSize);
    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endIdx = pageSize === 0 ? totalItems : Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="bg-white/70 border border-white/60 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'SAPO_ORDERED' ? "Tìm theo tên khách, tên task hoặc mã Sapo..." : "Tìm theo tên khách hoặc task..."}
            className="w-full pl-9 pr-8 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Page Size Selector & Pagination */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3">
          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>Tất cả</option>
            </select>
          </div>

          {/* Counts info */}
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {totalItems > 0 ? (
              <>
                <span className="font-bold text-slate-700">{startIdx}-{endIdx}</span> / <span className="font-bold text-slate-700">{totalItems}</span>
              </>
            ) : '0 kết quả'}
          </span>

          {/* Page buttons */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white transition-all"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <span className="text-xs font-bold text-slate-700 px-1.5">
                {currentPage}/{totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-white transition-all"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium">Đang tải dữ liệu...</div>;

  return (
    <>
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 overflow-visible sm:overflow-hidden order-2 sm:order-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-1 p-1 bg-slate-200/50 backdrop-blur-sm rounded-xl border border-white/20 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('DESIGNING')}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === 'DESIGNING' ? 'font-bold bg-white text-blue-600 shadow-sm border border-slate-200' : 'font-semibold text-slate-600 hover:bg-white/40'}`}
            >
              Đang thiết kế ({designingTasks.length})
            </button>
            <button 
              onClick={() => setActiveTab('WAITING_DEPOSIT')}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === 'WAITING_DEPOSIT' ? 'font-bold bg-white text-blue-600 shadow-sm border border-slate-200' : 'font-semibold text-slate-600 hover:bg-white/40'}`}
            >
              Đợi cọc ({waitingTasks.length})
            </button>
            <button 
              onClick={() => setActiveTab('SAPO_ORDERED')}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === 'SAPO_ORDERED' ? 'font-bold bg-white text-blue-600 shadow-sm border border-slate-200' : 'font-semibold text-slate-600 hover:bg-white/40'}`}
            >
              Đã lên đơn Sapo ({allSapoTasks.length})
            </button>
            <button 
              onClick={() => setActiveTab('NO_ORDER')}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === 'NO_ORDER' ? 'font-bold bg-white text-blue-600 shadow-sm border border-slate-200' : 'font-semibold text-slate-600 hover:bg-white/40'}`}
            >
              Đuổi khách ({allNoOrderTasks.length})
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden sm:flex items-center bg-slate-200/50 backdrop-blur-sm border border-white/20 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                title="Dạng danh sách"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid2')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid2' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                title="Dạng lưới (2 cột)"
              >
                <Grid2x2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid3')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid3' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                title="Dạng lưới (3 cột)"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={() => {
                const createBtn = document.querySelector('button[aria-label="Tạo Task"]');
                if (createBtn) (createBtn as HTMLButtonElement).click();
                window.dispatchEvent(new CustomEvent('openCreateTaskModal'));
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              TẠO TASK MỚI
            </button>
          </div>
        </div>

        {/* Toolbar filter & search for SAPO_ORDERED & NO_ORDER tabs */}
        {activeTab === 'SAPO_ORDERED' && renderFilterAndPagination(filteredSapoTasks.length)}
        {activeTab === 'NO_ORDER' && renderFilterAndPagination(filteredNoOrderTasks.length)}

        <div className={`flex-1 overflow-visible sm:overflow-y-auto pr-0 sm:pr-2 custom-scrollbar ${viewMode === 'list' ? 'flex flex-col gap-3' : viewMode === 'grid2' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 content-start' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start'}`}>
          {activeTab === 'DESIGNING' && (
            designingTasks.length > 0 ? designingTasks.map(renderTaskCard) : <EmptyState message="Chưa có công việc trong mục Đang thiết kế." />
          )}
          {activeTab === 'WAITING_DEPOSIT' && (
            waitingTasks.length > 0 ? waitingTasks.map(renderTaskCard) : <EmptyState message="Chưa có công việc trong mục Đợi cọc." />
          )}
          {activeTab === 'SAPO_ORDERED' && (
            paginatedSapoTasks.length > 0 ? (
              paginatedSapoTasks.map(renderTaskCard)
            ) : (
              <EmptyState message={searchTerm ? "Không tìm thấy công việc nào khớp với từ khóa tìm kiếm." : "Chưa có công việc trong mục Đã lên đơn Sapo."} />
            )
          )}
          {activeTab === 'NO_ORDER' && (
            paginatedNoOrderTasks.length > 0 ? (
              paginatedNoOrderTasks.map(renderTaskCard)
            ) : (
              <EmptyState message={searchTerm ? "Không tìm thấy công việc nào khớp với từ khóa tìm kiếm." : "Chưa có công việc trong mục Đuổi khách."} />
            )
          )}
        </div>
      </div>

      <aside className="w-full sm:w-80 flex-shrink-0 flex flex-col gap-4 sm:gap-6 overflow-visible sm:overflow-y-auto custom-scrollbar pr-0 order-1 sm:order-2">
        {/* System Overview Card */}
        <div className="bg-white/60 border border-white/40 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col gap-6">
          <div className="flex flex-col gap-1 border-b border-slate-200/50 pb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tổng quan hệ thống</h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase">Thống kê toàn thời gian</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 p-4 rounded-2xl flex flex-col">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Tổng Task</span>
              <span className="text-2xl font-black text-blue-700">{tasks.length}</span>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-2xl flex flex-col">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Tổng Click</span>
              <span className="text-2xl font-black text-emerald-700">{totalClicks}</span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Đang thiết kế (Cũ → Mới)
              </span>
              <span className="bg-slate-200/50 px-2 py-0.5 rounded-full font-bold text-slate-700">{designingTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                Đợi cọc (Cũ → Mới)
              </span>
              <span className="bg-slate-200/50 px-2 py-0.5 rounded-full font-bold text-slate-700">{waitingTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Đã lên Sapo (Mới → Cũ)
              </span>
              <span className="bg-slate-200/50 px-2 py-0.5 rounded-full font-bold text-slate-700">{allSapoTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Đuổi khách (Mới → Cũ)
              </span>
              <span className="bg-slate-200/50 px-2 py-0.5 rounded-full font-bold text-slate-700">{allNoOrderTasks.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/40">
            <div className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-emerald-500 left-0 top-0 transition-all duration-500" 
                style={{ width: `${tasks.length > 0 ? (allSapoTasks.length / tasks.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hoàn tất</span>
                <span className="text-lg font-black text-emerald-600">{tasks.length > 0 ? ((allSapoTasks.length / tasks.length) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Đuổi khách</span>
                <span className="text-lg font-black text-rose-500">{tasks.length > 0 ? ((allNoOrderTasks.length / tasks.length) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Database Status Card with Collapsible Firebase Usage */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl shadow-slate-900/20 text-white flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <p className="text-xs font-bold text-emerald-400">Online Realtime</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFirebaseUsage(!showFirebaseUsage)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700/80 transition-all active:scale-95"
              title="Xem thông số gói Free và khi nào cần nâng cấp"
            >
              <span>{showFirebaseUsage ? 'Thu gọn' : 'Hạn mức Free'}</span>
              {showFirebaseUsage ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px]">
            <span className="text-slate-400 font-medium">Gói Cloud:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              Firebase Spark (Free 100%)
            </span>
          </div>

          {/* Collapsible Usage Detail Section */}
          {showFirebaseUsage && (
            <div className="flex flex-col gap-3.5 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-2">
                <span>Hạn mức Free hàng ngày</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  Đang dùng: Rất thấp (&lt;1%)
                </span>
              </div>

              {/* Limits grid */}
              <div className="space-y-2.5">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-medium">Lượt Đọc (Reads)</span>
                    <span className="text-emerald-400 font-bold">50.000 / ngày</span>
                  </div>
                  <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[2%] rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Dùng Realtime Listener nên chỉ tốn 1 lượt khi mở tab</span>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-medium">Lượt Ghi (Writes)</span>
                    <span className="text-blue-400 font-bold">20.000 / ngày</span>
                  </div>
                  <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full w-[1%] rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Tạo task mới hoặc đổi trạng thái tính 1 lượt</span>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 font-medium">Dung lượng Database</span>
                    <span className="text-yellow-400 font-bold">1 GB (~500.000 task)</span>
                  </div>
                  <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-400 h-full w-[1%] rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Hiện tại chứa ~{tasks.length} task (&lt;1 MB)</span>
                </div>

                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/40 flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-medium">Kết nối cùng lúc</span>
                  <span className="text-purple-300 font-bold">100 người online</span>
                </div>
              </div>

              {/* Upgrade guidance */}
              <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-2xl flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Khi nào cần nâng cấp gói Blaze?</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Bạn chỉ cần nâng cấp trả phí khi công ty có <span className="font-bold text-white">&gt; 100 nhân viên</span> mở app cùng lúc hoặc xử lý <span className="font-bold text-white">&gt; 20.000 task</span> mỗi ngày.
                </p>
                <p className="text-emerald-400 font-semibold text-[10px]">
                  ✓ Hiện tại ứng dụng chạy trọn đời hoàn toàn miễn phí (0đ).
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Sapo Modal */}
      {sapoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSapoModalOpen(false)}></div>
          <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-lg transform transition-all">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-tight">
                Đã lên đơn Sapo
              </h3>
              <form onSubmit={handleSapoSubmit}>
                <div className="space-y-5 text-left">
                  <div>
                    <label htmlFor="sapoCode" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Mã đơn Sapo
                    </label>
                    <input
                      type="text"
                      name="sapoCode"
                      id="sapoCode"
                      required
                      value={sapoCode}
                      onChange={(e) => setSapoCode(e.target.value)}
                      className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                      placeholder="DH123456"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={actionLoading || !sapoCode.trim()}
                    className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl px-6 py-3 bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
                  >
                    {actionLoading ? 'Đang lưu...' : 'Hoàn thành'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSapoModalOpen(false)}
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

      {/* Reject Modal */}
      {rejectTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !actionLoading && setRejectTask(null)}></div>
          <div className="relative z-10 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-sm transform transition-all text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Ban className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Đuổi khách?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Bạn có chắc chắn muốn chuyển task <span className="font-bold text-slate-700">"{rejectTask.name}"</span> sang trạng thái Đuổi khách?
            </p>
            <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl px-6 py-3 bg-red-600 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Đuổi khách'}
              </button>
              <button
                type="button"
                onClick={() => setRejectTask(null)}
                disabled={actionLoading}
                className="w-full sm:w-auto flex-1 inline-flex justify-center items-center rounded-xl border border-slate-200 px-6 py-3 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

