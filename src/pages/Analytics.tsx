import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Task, User } from '../types';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  MousePointerClick, 
  CheckCircle2, 
  FileText, 
  ArrowLeft, 
  Calendar, 
  Filter, 
  Zap, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  Users, 
  Download, 
  Copy, 
  Check, 
  RefreshCw,
  Sparkles,
  PieChart as PieChartIcon,
  UserPlus,
  UserCheck,
  ShoppingBag,
  Palette,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type DateRangeOption = 'today' | '7days' | '14days' | '30days' | 'thisMonth' | 'all';
type TeamViewMode = 'all' | 'creator' | 'designer';

export const Analytics = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState<DateRangeOption>('7days');
  const [selectedDesigner, setSelectedDesigner] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [teamViewMode, setTeamViewMode] = useState<TeamViewMode>('all');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    // Subscribe to tasks
    const tasksQuery = query(collection(db, 'tasks'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      setLoading(false);
    }, (err) => {
      console.error("Lỗi lấy dữ liệu task cho phân tích:", err);
      setLoading(false);
    });

    // Subscribe to users
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(userList);
    }, (err) => {
      console.error("Lỗi lấy danh sách user:", err);
    });

    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, []);

  const getMs = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0);
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDisplayDate = (dateKey: string): string => {
    const [y, m, d] = dateKey.split('-');
    return `${d}/${m}`;
  };

  const formatDuration = (ms: number): string => {
    if (!ms || ms <= 0) return '0p';
    const totalMinutes = Math.round(ms / (1000 * 60));
    if (totalMinutes < 60) return `${totalMinutes} phút`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  // List of all designers
  const designerOptions = useMemo(() => {
    const designerNames = new Set<string>();
    users.filter(u => u.role === 'DESIGNER').forEach(u => {
      if (u.displayName) designerNames.add(u.displayName);
      else if (u.username) designerNames.add(u.username);
    });
    tasks.forEach(t => {
      if (t.updatedByName) designerNames.add(t.updatedByName);
    });
    return Array.from(designerNames).filter(Boolean).sort();
  }, [users, tasks]);

  // List of all task creators (Sales / Admins / users who created tasks)
  const creatorOptions = useMemo(() => {
    const creatorNames = new Set<string>();
    users.filter(u => u.role === 'SALE' || u.role === 'ADMIN').forEach(u => {
      if (u.displayName) creatorNames.add(u.displayName);
      else if (u.username) creatorNames.add(u.username);
    });
    tasks.forEach(t => {
      if (t.createdByName) creatorNames.add(t.createdByName);
    });
    return Array.from(creatorNames).filter(Boolean).sort();
  }, [users, tasks]);

  // Determine date bounds
  const rangeBounds = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (dateRange === 'today') {
      // today only
    } else if (dateRange === '7days') {
      start.setDate(now.getDate() - 6);
    } else if (dateRange === '14days') {
      start.setDate(now.getDate() - 13);
    } else if (dateRange === '30days') {
      start.setDate(now.getDate() - 29);
    } else if (dateRange === 'thisMonth') {
      start.setDate(1);
    } else {
      // all time: earliest task
      let earliest = now.getTime();
      tasks.forEach(t => {
        const ms = getMs(t.createdAt);
        if (ms > 0 && ms < earliest) earliest = ms;
      });
      start.setTime(earliest);
    }
    return { startMs: start.getTime(), endMs: now.getTime(), startDate: start, endDate: now };
  }, [dateRange, tasks]);

  // Filter tasks by date range, selected designer, and selected creator
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const createdMs = getMs(task.createdAt || task.updatedAt);
      const inDateRange = dateRange === 'all' || (createdMs >= rangeBounds.startMs && createdMs <= rangeBounds.endMs);
      if (!inDateRange) return false;

      // Filter by Designer
      if (selectedDesigner !== 'all') {
        const isDesigner = (task.updatedByName && task.updatedByName.toLowerCase() === selectedDesigner.toLowerCase());
        if (!isDesigner) return false;
      }

      // Filter by Creator
      if (selectedCreator !== 'all') {
        const isCreator = (task.createdByName && task.createdByName.toLowerCase() === selectedCreator.toLowerCase());
        if (!isCreator) return false;
      }

      return true;
    });
  }, [tasks, rangeBounds, dateRange, selectedDesigner, selectedCreator]);

  // Daily statistics for charts
  const dailyData = useMemo(() => {
    const dateMap = new Map<string, {
      dateKey: string;
      displayDate: string;
      newTasks: number;
      completedTasks: number;
      sapoOrdered: number;
      noOrder: number;
      clicks: number;
      totalDurationMs: number;
      durationCount: number;
    }>();

    const current = new Date(rangeBounds.startDate);
    const end = new Date(rangeBounds.endDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let dayCount = 0;
    while (current <= end && dayCount < 90) {
      const key = formatDateKey(current);
      dateMap.set(key, {
        dateKey: key,
        displayDate: formatDisplayDate(key),
        newTasks: 0,
        completedTasks: 0,
        sapoOrdered: 0,
        noOrder: 0,
        clicks: 0,
        totalDurationMs: 0,
        durationCount: 0
      });
      current.setDate(current.getDate() + 1);
      dayCount++;
    }

    filteredTasks.forEach(task => {
      const createdMs = getMs(task.createdAt);
      if (createdMs > 0) {
        const cDate = new Date(createdMs);
        const cKey = formatDateKey(cDate);
        if (dateMap.has(cKey)) {
          const entry = dateMap.get(cKey)!;
          entry.newTasks += 1;
          entry.clicks += (task.linkClickCount || 0);
        }
      }

      // Completed design
      const completedMs = getMs(task.designCompletedAt);
      if (completedMs > 0) {
        const dDate = new Date(completedMs);
        const dKey = formatDateKey(dDate);
        if (dateMap.has(dKey)) {
          const entry = dateMap.get(dKey)!;
          entry.completedTasks += 1;
        }

        // Processing duration
        if (createdMs > 0 && completedMs > createdMs) {
          const duration = completedMs - createdMs;
          if (duration > 0 && duration < 14 * 24 * 3600 * 1000) {
            const entry = dateMap.get(formatDateKey(new Date(completedMs)));
            if (entry) {
              entry.totalDurationMs += duration;
              entry.durationCount += 1;
            }
          }
        }
      }

      // Sapo ordered
      const sapoMs = getMs(task.sapoOrderedAt);
      if (sapoMs > 0) {
        const sKey = formatDateKey(new Date(sapoMs));
        if (dateMap.has(sKey)) {
          dateMap.get(sKey)!.sapoOrdered += 1;
        }
      }

      // No order
      const noOrderMs = getMs(task.noOrderAt);
      if (noOrderMs > 0) {
        const nKey = formatDateKey(new Date(noOrderMs));
        if (dateMap.has(nKey)) {
          dateMap.get(nKey)!.noOrder += 1;
        }
      }
    });

    return Array.from(dateMap.values()).map(d => ({
      ...d,
      avgSpeedMinutes: d.durationCount > 0 ? Math.round(d.totalDurationMs / d.durationCount / (60 * 1000)) : 0
    }));
  }, [filteredTasks, rangeBounds]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalNew = filteredTasks.length;
    const sapoTasks = filteredTasks.filter(t => t.status === 'SAPO_ORDERED');
    const waitingTasks = filteredTasks.filter(t => t.status === 'WAITING_DEPOSIT');
    const designingTasks = filteredTasks.filter(t => t.status === 'DESIGNING');
    const noOrderTasks = filteredTasks.filter(t => t.status === 'NO_ORDER');
    const totalClicks = filteredTasks.reduce((acc, t) => acc + (t.linkClickCount || 0), 0);

    // Processing speed calculation (from created -> design completed)
    const durations: number[] = [];
    filteredTasks.forEach(t => {
      const created = getMs(t.createdAt);
      const completed = getMs(t.designCompletedAt) || (t.status === 'SAPO_ORDERED' ? getMs(t.sapoOrderedAt) : 0);
      if (created > 0 && completed > created) {
        const diff = completed - created;
        if (diff > 0 && diff < 14 * 24 * 3600 * 1000) {
          durations.push(diff);
        }
      }
    });

    durations.sort((a, b) => a - b);
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const minDurationMs = durations.length > 0 ? durations[0] : 0;
    const maxDurationMs = durations.length > 0 ? durations[durations.length - 1] : 0;
    const medianDurationMs = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

    // Time from Design Completed -> Sapo Ordered
    const depositDurations: number[] = [];
    filteredTasks.forEach(t => {
      const comp = getMs(t.designCompletedAt);
      const sapo = getMs(t.sapoOrderedAt);
      if (comp > 0 && sapo > comp) {
        depositDurations.push(sapo - comp);
      }
    });
    const avgDepositDurationMs = depositDurations.length > 0 ? depositDurations.reduce((a, b) => a + b, 0) / depositDurations.length : 0;

    // Duration brackets
    const brackets = {
      superFast: 0,
      fast: 0,
      standard: 0,
      moderate: 0,
      slow: 0
    };

    durations.forEach(d => {
      const m = d / (60 * 1000);
      if (m < 15) brackets.superFast++;
      else if (m < 30) brackets.fast++;
      else if (m < 60) brackets.standard++;
      else if (m < 120) brackets.moderate++;
      else brackets.slow++;
    });

    return {
      totalNew,
      sapoCount: sapoTasks.length,
      waitingCount: waitingTasks.length,
      designingCount: designingTasks.length,
      noOrderCount: noOrderTasks.length,
      totalClicks,
      avgClicksPerTask: totalNew > 0 ? (totalClicks / totalNew).toFixed(1) : '0',
      avgDurationMs,
      minDurationMs,
      maxDurationMs,
      medianDurationMs,
      avgDepositDurationMs,
      processedCount: durations.length,
      brackets,
      conversionRate: totalNew > 0 ? ((sapoTasks.length / totalNew) * 100).toFixed(1) : '0',
      dropRate: totalNew > 0 ? ((noOrderTasks.length / totalNew) * 100).toFixed(1) : '0'
    };
  }, [filteredTasks]);

  // Designer Performance Ranking
  const designerStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalHandled: number;
      completed: number;
      sapoOrdered: number;
      noOrder: number;
      clicks: number;
      durations: number[];
    }>();

    filteredTasks.forEach(task => {
      const dName = task.updatedByName || 'Chưa nhận';
      if (!map.has(dName)) {
        map.set(dName, {
          name: dName,
          totalHandled: 0,
          completed: 0,
          sapoOrdered: 0,
          noOrder: 0,
          clicks: 0,
          durations: []
        });
      }

      const st = map.get(dName)!;
      st.totalHandled += 1;
      st.clicks += (task.linkClickCount || 0);

      if (task.status === 'SAPO_ORDERED') st.sapoOrdered += 1;
      if (task.status === 'WAITING_DEPOSIT' || task.status === 'SAPO_ORDERED') st.completed += 1;
      if (task.status === 'NO_ORDER') st.noOrder += 1;

      const created = getMs(task.createdAt);
      const finished = getMs(task.designCompletedAt) || (task.status === 'SAPO_ORDERED' ? getMs(task.sapoOrderedAt) : 0);
      if (created > 0 && finished > created) {
        const diff = finished - created;
        if (diff > 0 && diff < 14 * 24 * 3600 * 1000) {
          st.durations.push(diff);
        }
      }
    });

    const list = Array.from(map.values()).map(item => {
      const avgDuration = item.durations.length > 0 
        ? item.durations.reduce((a, b) => a + b, 0) / item.durations.length 
        : 0;
      const conversionRate = item.totalHandled > 0 ? ((item.sapoOrdered / item.totalHandled) * 100) : 0;
      return {
        ...item,
        avgDurationMs: avgDuration,
        avgDurationMinutes: Math.round(avgDuration / (60 * 1000)),
        conversionRate: conversionRate.toFixed(1),
        avgClicks: item.totalHandled > 0 ? (item.clicks / item.totalHandled).toFixed(1) : '0'
      };
    });

    return list.sort((a, b) => b.totalHandled - a.totalHandled);
  }, [filteredTasks]);

  // Creator / Sale Performance Ranking
  const creatorStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalCreated: number;
      sapoOrdered: number;
      waitingDeposit: number;
      designing: number;
      noOrder: number;
      clicks: number;
      orderDurations: number[];
    }>();

    filteredTasks.forEach(task => {
      const cName = task.createdByName || 'Chưa rõ';
      if (!map.has(cName)) {
        map.set(cName, {
          name: cName,
          totalCreated: 0,
          sapoOrdered: 0,
          waitingDeposit: 0,
          designing: 0,
          noOrder: 0,
          clicks: 0,
          orderDurations: []
        });
      }

      const st = map.get(cName)!;
      st.totalCreated += 1;
      st.clicks += (task.linkClickCount || 0);

      if (task.status === 'SAPO_ORDERED') {
        st.sapoOrdered += 1;
        const created = getMs(task.createdAt);
        const sapo = getMs(task.sapoOrderedAt);
        if (created > 0 && sapo > created) {
          const diff = sapo - created;
          if (diff > 0 && diff < 30 * 24 * 3600 * 1000) {
            st.orderDurations.push(diff);
          }
        }
      } else if (task.status === 'WAITING_DEPOSIT') {
        st.waitingDeposit += 1;
      } else if (task.status === 'DESIGNING') {
        st.designing += 1;
      } else if (task.status === 'NO_ORDER') {
        st.noOrder += 1;
      }
    });

    const list = Array.from(map.values()).map(item => {
      const avgOrderDuration = item.orderDurations.length > 0
        ? item.orderDurations.reduce((a, b) => a + b, 0) / item.orderDurations.length
        : 0;
      const conversionRate = item.totalCreated > 0 ? (item.sapoOrdered / item.totalCreated * 100) : 0;
      const dropRate = item.totalCreated > 0 ? (item.noOrder / item.totalCreated * 100) : 0;

      return {
        ...item,
        avgOrderDurationMs: avgOrderDuration,
        conversionRate: conversionRate.toFixed(1),
        dropRate: dropRate.toFixed(1),
        avgClicks: item.totalCreated > 0 ? (item.clicks / item.totalCreated).toFixed(1) : '0'
      };
    });

    return list.sort((a, b) => b.totalCreated - a.totalCreated);
  }, [filteredTasks]);

  // Click distribution data
  const clickDistribution = useMemo(() => {
    let zero = 0;
    let one = 0;
    let twoThree = 0;
    let fourPlus = 0;

    filteredTasks.forEach(t => {
      const c = t.linkClickCount || 0;
      if (c === 0) zero++;
      else if (c === 1) one++;
      else if (c <= 3) twoThree++;
      else fourPlus++;
    });

    return [
      { name: 'Chưa click (0)', value: zero, color: '#94a3b8' },
      { name: 'Chuẩn 1 click', value: one, color: '#10b981' },
      { name: 'Sửa nhẹ (2-3)', value: twoThree, color: '#3b82f6' },
      { name: 'Nhiều vòng (4+)', value: fourPlus, color: '#f59e0b' },
    ];
  }, [filteredTasks]);

  // Status breakdown pie data
  const statusPieData = useMemo(() => {
    return [
      { name: 'Đang thiết kế', value: kpis.designingCount, color: '#3b82f6' },
      { name: 'Đợi cọc', value: kpis.waitingCount, color: '#eab308' },
      { name: 'Đã lên Sapo', value: kpis.sapoCount, color: '#10b981' },
      { name: 'Đuổi khách', value: kpis.noOrderCount, color: '#f43f5e' },
    ].filter(item => item.value > 0);
  }, [kpis]);

  // Copy quick summary to clipboard
  const handleCopySummary = () => {
    const rangeText = dateRange === 'today' ? 'Hôm nay' :
                      dateRange === '7days' ? '7 ngày qua' :
                      dateRange === '14days' ? '14 ngày qua' :
                      dateRange === '30days' ? '30 ngày qua' :
                      dateRange === 'thisMonth' ? 'Tháng này' : 'Toàn thời gian';
    
    let summary = `📊 BÁO CÁO PHÂN TÍCH TIẾN ĐỘ THIẾT KẾ (${rangeText})\n` +
      `-----------------------------------------\n` +
      `• Tổng task mới: ${kpis.totalNew}\n` +
      `• Đã lên đơn Sapo: ${kpis.sapoCount} (${kpis.conversionRate}%)\n` +
      `• Đợi cọc: ${kpis.waitingCount}\n` +
      `• Đang làm: ${kpis.designingCount}\n` +
      `• Đuổi khách: ${kpis.noOrderCount} (${kpis.dropRate}%)\n` +
      `• Tốc độ xử lý TB: ${formatDuration(kpis.avgDurationMs)}\n` +
      `• Tổng lượt click: ${kpis.totalClicks} (TB ${kpis.avgClicksPerTask} click/task)\n` +
      `-----------------------------------------\n` +
      `🏆 NGƯỜI TẠO TASK (SALE) NĂNG SUẤT:\n` +
      creatorStats.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ${c.totalCreated} task, ${c.sapoOrdered} Sapo (${c.conversionRate}%), TB chốt: ${formatDuration(c.avgOrderDurationMs)}`).join('\n') +
      `\n-----------------------------------------\n` +
      `⚡ THIẾT KẾ XỬ LÝ NHANH:\n` +
      designerStats.slice(0, 5).map((d, i) => `${i + 1}. ${d.name}: ${d.totalHandled} task, ${d.sapoOrdered} Sapo, TB: ${formatDuration(d.avgDurationMs)}`).join('\n');

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Mã Task', 'Tên Task', 'Trạng thái', 'Mã Sapo', 'Người tạo (Sale)', 'Người thiết kế', 'Lượt Click', 'Ngày tạo', 'Ngày hoàn thành TK', 'Ngày lên Sapo', 'Thời gian xử lý (phút)'];
    const rows = filteredTasks.map(t => {
      const created = getMs(t.createdAt);
      const comp = getMs(t.designCompletedAt);
      const sapo = getMs(t.sapoOrderedAt);
      const durationMin = created > 0 && comp > created ? Math.round((comp - created) / (60 * 1000)) : '';
      return [
        `"${t.id}"`,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        `"${t.status}"`,
        `"${t.sapoOrderCode || ''}"`,
        `"${t.createdByName || ''}"`,
        `"${t.updatedByName || ''}"`,
        t.linkClickCount || 0,
        created ? `"${new Date(created).toLocaleString('vi-VN')}"` : '""',
        comp ? `"${new Date(comp).toLocaleString('vi-VN')}"` : '""',
        sapo ? `"${new Date(sapo).toLocaleString('vi-VN')}"` : '""',
        durationMin
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-phan-tich-task-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = selectedDesigner !== 'all' || selectedCreator !== 'all' || dateRange !== '7days';

  const resetFilters = () => {
    setSelectedDesigner('all');
    setSelectedCreator('all');
    setDateRange('7days');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="font-semibold text-sm">Đang tải và tính toán dữ liệu phân tích...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-12 w-full max-w-7xl mx-auto">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Link 
            to="/" 
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200/60 active:scale-95"
            title="Quay lại danh sách Task"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                Phân Tích & Hiệu Suất Hệ Thống
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Realtime Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Theo dõi lượng task mới, tốc độ xử lý của thiết kế và năng suất của người tạo task (Sale)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all active:scale-95"
              title="Đặt lại bộ lọc mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all active:scale-95"
            title="Sao chép tóm tắt để gửi vào Zalo/Telegram"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copiedSummary ? 'Đã sao chép!' : 'Copy tóm tắt'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            title="Xuất file Excel CSV chi tiết"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto custom-scrollbar">
          <Calendar className="w-4 h-4 text-slate-400 ml-2 hidden sm:block" />
          <button
            onClick={() => setDateRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setDateRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === '7days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            7 ngày qua
          </button>
          <button
            onClick={() => setDateRange('14days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === '14days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            14 ngày qua
          </button>
          <button
            onClick={() => setDateRange('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === '30days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            30 ngày qua
          </button>
          <button
            onClick={() => setDateRange('thisMonth')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === 'thisMonth' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${dateRange === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-white/50'}`}
          >
            Toàn thời gian
          </button>
        </div>

        {/* Dropdown Filters: Người tạo task & Người thiết kế */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Filter by Creator (Người tạo task / Sale) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              Người tạo:
            </label>
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all flex-1 sm:w-44"
            >
              <option value="all">Tất cả người tạo ({creatorOptions.length})</option>
              {creatorOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Filter by Designer */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              Thiết kế:
            </label>
            <select
              value={selectedDesigner}
              onChange={(e) => setSelectedDesigner(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all flex-1 sm:w-44"
            >
              <option value="all">Tất cả thiết kế ({designerOptions.length})</option>
              {designerOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lượng task mới */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lượng Task Mới</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{kpis.totalNew}</span>
              <span className="text-xs text-slate-500 font-semibold">task</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{kpis.sapoCount} đã lên Sapo ({kpis.conversionRate}%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tốc độ xử lý trung bình */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốc Độ Xử Lý TB</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">
                {kpis.avgDurationMs > 0 ? formatDuration(kpis.avgDurationMs) : 'Chưa có'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-slate-500">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Nhanh nhất: {kpis.minDurationMs > 0 ? formatDuration(kpis.minDurationMs) : '--'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Lượng click & click/task */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Lượt Click</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{kpis.totalClicks}</span>
              <span className="text-xs text-slate-500 font-semibold">lượt click</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-blue-600">
              <Activity className="w-3.5 h-3.5" />
              <span>TB: {kpis.avgClicksPerTask} click / task</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tỷ lệ hoàn tất & cọc */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Chốt Sapo</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-violet-700">{kpis.conversionRate}%</span>
              <span className="text-xs text-slate-500 font-semibold">thành công</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-rose-600">
              <span>Đuổi khách: {kpis.noOrderCount} task ({kpis.dropRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Biểu đồ lượng task mới & hoàn thành theo ngày */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Biểu đồ lượng task mới & hoàn thành mỗi ngày
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh số lượng task tạo mới và số task đã hoàn thành thiết kế / lên đơn Sapo
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Cột
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${chartType === 'area' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Miền
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="newTasks" name="Task mới tạo" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completedTasks" name="Hoàn thành TK" fill="#eab308" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sapoOrdered" name="Lên đơn Sapo" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="noOrder" name="Đuổi khách" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSapo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="newTasks" name="Task mới tạo" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNew)" strokeWidth={2} />
                  <Area type="monotone" dataKey="sapoOrdered" name="Lên đơn Sapo" stroke="#10b981" fillOpacity={1} fill="url(#colorSapo)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Biểu đồ trạng thái & Breakdown */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              Tỷ lệ trạng thái công việc
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Phân bổ các giai đoạn trong kỳ</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Không có dữ liệu trong khoảng thời gian này</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Đang thiết kế</span>
                <span className="font-bold text-slate-800">{kpis.designingCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Đợi cọc</span>
                <span className="font-bold text-slate-800">{kpis.waitingCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Đã lên Sapo</span>
                <span className="font-bold text-slate-800">{kpis.sapoCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/60 border border-rose-100">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Đuổi khách</span>
                <span className="font-bold text-slate-800">{kpis.noOrderCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Tốc độ xử lý chi tiết & Lượng Click */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tốc độ xử lý theo thời gian & Dải thời gian */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Tốc độ xử lý task & Phân bổ thời gian
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thời gian từ khi tạo task đến khi thiết kế hoàn thành
            </p>
          </div>

          {/* Speed Trend Line Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="p" />
                <Tooltip
                  formatter={(val: any) => [`${val} phút`, 'Tốc độ TB']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSpeedMinutes"
                  name="Tốc độ TB (phút)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Time Distribution Bars */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phân bổ dải thời gian xử lý:</span>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">⚡ Siêu tốc (&lt; 15 phút)</span>
                <span className="font-bold text-emerald-600">{kpis.brackets.superFast} task</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${kpis.processedCount > 0 ? (kpis.brackets.superFast / kpis.processedCount) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">✨ Nhanh (15 - 30 phút)</span>
                <span className="font-bold text-blue-600">{kpis.brackets.fast} task</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${kpis.processedCount > 0 ? (kpis.brackets.fast / kpis.processedCount) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">⏳ Tiêu chuẩn (30 - 60 phút)</span>
                <span className="font-bold text-amber-600">{kpis.brackets.standard} task</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${kpis.processedCount > 0 ? (kpis.brackets.standard / kpis.processedCount) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">🐢 Kéo dài (&gt; 1 giờ)</span>
                <span className="font-bold text-rose-500">{kpis.brackets.moderate + kpis.brackets.slow} task</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${kpis.processedCount > 0 ? ((kpis.brackets.moderate + kpis.brackets.slow) / kpis.processedCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lượng click mỗi ngày & Click Distribution */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-emerald-600" />
              Phân tích lượt click & mức độ sửa đổi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi số lần thiết kế mở link task (càng ít click = 1 lần chuẩn ngay)
            </p>
          </div>

          {/* Daily Clicks Bar Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} click`, 'Lượt click']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="clicks" name="Lượt click" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Click categories */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phân loại theo số lần mở link:</span>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {clickDistribution.map(item => (
                <div key={item.name} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value} task</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              💡 Task có 1 click là hoàn thành ngay không cần mở lại sửa. Task &gt; 3 click thường là khách sửa duyệt nhiều lần.
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Năng Suất Nhân Sự - Tùy chọn xem Người Tạo Task (Sale) & Đội Ngũ Thiết Kế */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Báo cáo hiệu suất theo Nhân Sự
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân tích chi tiết khối lượng, tỷ lệ chốt đơn và tốc độ của cả Người tạo task (Sale) và Thiết kế
            </p>
          </div>

          {/* Switcher Tab: Tất cả / Người tạo / Thiết kế */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => setTeamViewMode('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                teamViewMode === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Xem cả hai</span>
            </button>

            <button
              onClick={() => setTeamViewMode('creator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                teamViewMode === 'creator' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Người tạo task (Sale)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-black">
                {creatorStats.length}
              </span>
            </button>

            <button
              onClick={() => setTeamViewMode('designer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                teamViewMode === 'designer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Thiết kế</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-black">
                {designerStats.length}
              </span>
            </button>
          </div>
        </div>

        {/* 1. BẢNG PHÂN TÍCH NGƯỜI TẠO TASK (SALE) */}
        {(teamViewMode === 'all' || teamViewMode === 'creator') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Bảng xếp hạng Người tạo task (Sale / Quản lý)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi số lượng task tạo, số đơn chốt thành công Sapo và tỷ lệ chuyển đổi
                  </p>
                </div>
              </div>

              {selectedCreator !== 'all' && (
                <button
                  onClick={() => setSelectedCreator('all')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Hiển thị tất cả người tạo
                </button>
              )}
            </div>

            {creatorStats.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left border-collapse bg-white/60">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Người tạo task</th>
                      <th className="py-3 px-3 text-center">Tổng Task Tạo</th>
                      <th className="py-3 px-3 text-center">Đã Lên Sapo</th>
                      <th className="py-3 px-3 text-center">Tỷ Lệ Chốt Sapo</th>
                      <th className="py-3 px-3 text-center">Đang TK / Đợi cọc</th>
                      <th className="py-3 px-3 text-center">Đuổi Khách</th>
                      <th className="py-3 px-3 text-center">Tốc Độ Chốt TB</th>
                      <th className="py-3 px-4 text-center">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {creatorStats.map((c, index) => {
                      const isTopCreator = index === 0;
                      const isHighConversion = Number(c.conversionRate) >= 70;
                      const isFastClosing = c.avgOrderDurationMs > 0 && c.avgOrderDurationMs < 2 * 3600 * 1000;

                      return (
                        <tr 
                          key={c.name}
                          onClick={() => setSelectedCreator(c.name)}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedCreator === c.name ? 'bg-blue-50/80 font-bold' : ''}`}
                          title="Nhấn để lọc báo cáo theo riêng người tạo này"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                              index === 0 ? 'bg-amber-400 text-amber-950' :
                              index === 1 ? 'bg-slate-300 text-slate-800' :
                              index === 2 ? 'bg-amber-600/30 text-amber-900' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="block text-slate-800 font-bold">{c.name}</span>
                              {selectedCreator === c.name && (
                                <span className="text-[10px] text-blue-600 font-semibold">Đang lọc</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                            {c.totalCreated}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                            {c.sapoOrdered}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              Number(c.conversionRate) >= 60 ? 'bg-emerald-100 text-emerald-700' : 
                              Number(c.conversionRate) >= 30 ? 'bg-blue-100 text-blue-700' : 
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {c.conversionRate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-slate-600">
                            {c.designing + c.waitingDeposit}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-semibold text-rose-500">
                              {c.noOrder} ({c.dropRate}%)
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600">
                            {c.avgOrderDurationMs > 0 ? formatDuration(c.avgOrderDurationMs) : '--'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isTopCreator && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  🏆 Tạo nhiều nhất
                                </span>
                              )}
                              {isHighConversion && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  🎯 Chốt cao
                                </span>
                              )}
                              {isFastClosing && (
                                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  ⚡ Chốt nhanh
                                </span>
                              )}
                              {!isTopCreator && !isHighConversion && !isFastClosing && (
                                <span className="text-slate-400 text-[11px]">Đều đặn</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200/60">
                Chưa có dữ liệu người tạo task trong khoảng thời gian này
              </div>
            )}
          </div>
        )}

        {/* 2. BẢNG PHÂN TÍCH ĐỘI NGŨ THIẾT KẾ */}
        {(teamViewMode === 'all' || teamViewMode === 'designer') && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Bảng xếp hạng & Tốc độ của Đội ngũ Thiết Kế
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đo lường thời gian xử lý trung bình và số lượng task hoàn thành của từng Designer
                  </p>
                </div>
              </div>

              {selectedDesigner !== 'all' && (
                <button
                  onClick={() => setSelectedDesigner('all')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Hiển thị tất cả thiết kế
                </button>
              )}
            </div>

            {designerStats.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left border-collapse bg-white/60">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Thiết kế</th>
                      <th className="py-3 px-3 text-center">Tổng Task Nhận</th>
                      <th className="py-3 px-3 text-center">Đã Lên Sapo</th>
                      <th className="py-3 px-3 text-center">Tỷ Lệ Chốt</th>
                      <th className="py-3 px-3 text-center">Tốc Độ Xử Lý TB</th>
                      <th className="py-3 px-3 text-center">Tổng Click</th>
                      <th className="py-3 px-3 text-center">TB Click/Task</th>
                      <th className="py-3 px-4 text-center">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {designerStats.map((d, index) => {
                      const isTopVol = index === 0;
                      const isFast = d.avgDurationMs > 0 && d.avgDurationMs < 30 * 60 * 1000;
                      const isHighConversion = Number(d.conversionRate) >= 70;

                      return (
                        <tr 
                          key={d.name}
                          onClick={() => setSelectedDesigner(d.name)}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedDesigner === d.name ? 'bg-blue-50/80 font-bold' : ''}`}
                          title="Nhấn để lọc riêng nhân sự thiết kế này"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                              index === 0 ? 'bg-amber-400 text-amber-950' :
                              index === 1 ? 'bg-slate-300 text-slate-800' :
                              index === 2 ? 'bg-amber-600/30 text-amber-900' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="block text-slate-800 font-bold">{d.name}</span>
                              {selectedDesigner === d.name && (
                                <span className="text-[10px] text-blue-600 font-semibold">Đang lọc</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                            {d.totalHandled}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                            {d.sapoOrdered}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              Number(d.conversionRate) >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.conversionRate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-amber-600">
                            {d.avgDurationMs > 0 ? formatDuration(d.avgDurationMs) : '--'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                            {d.clicks}
                          </td>
                          <td className="py-3.5 px-3 text-center font-medium text-slate-600">
                            {d.avgClicks}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isTopVol && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  🏆 Nhiều task nhất
                                </span>
                              )}
                              {isFast && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  ⚡ Nhanh nhạy
                                </span>
                              )}
                              {isHighConversion && (
                                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                  🎯 Chốt cao
                                </span>
                              )}
                              {!isTopVol && !isFast && !isHighConversion && (
                                <span className="text-slate-400 text-[11px]">Đang duy trì</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200/60">
                Chưa có dữ liệu thiết kế trong khoảng thời gian này
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 4: Top task có nhiều lượt click nhất (Sửa nhiều lần) */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Top các Task có lượng Click cao nhất
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Những task phải mở link nhiều lần (khách yêu cầu sửa kỹ hoặc thiết kế cần kiểm tra nhiều lượt)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks
            .slice()
            .sort((a, b) => (b.linkClickCount || 0) - (a.linkClickCount || 0))
            .slice(0, 6)
            .map((task, idx) => (
              <div 
                key={task.id}
                className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3 hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        #{idx + 1}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === 'SAPO_ORDERED' ? 'bg-emerald-100 text-emerald-700' :
                        task.status === 'WAITING_DEPOSIT' ? 'bg-yellow-100 text-yellow-700' :
                        task.status === 'NO_ORDER' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {task.status === 'SAPO_ORDERED' ? 'Đã lên Sapo' :
                         task.status === 'WAITING_DEPOSIT' ? 'Đợi cọc' :
                         task.status === 'NO_ORDER' ? 'Đuổi khách' : 'Đang TK'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 truncate" title={task.name}>
                      {task.name}
                    </h3>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-black text-blue-600">{task.linkClickCount || 0}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">clicks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex flex-col text-[10px] truncate max-w-[160px]">
                    <span className="truncate">Tạo: <b className="text-slate-700">{task.createdByName || 'Chưa rõ'}</b></span>
                    <span className="truncate">TK: <b className="text-slate-700">{task.updatedByName || 'Chưa nhận'}</b></span>
                  </div>
                  {task.sapoOrderCode && (
                    <span className="font-bold text-emerald-600 text-xs">
                      #{task.sapoOrderCode}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
