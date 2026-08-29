const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add filterCreator state
code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [filterCreator, setFilterCreator] = useState<string>('ALL');"
);

// 2. Add reset for filterCreator when tab changes
code = code.replace(
  "setCurrentPage(1);",
  "setCurrentPage(1);\n    if (activeTab === 'DESIGNING') setFilterCreator('ALL');"
);
code = code.replace(
  "[activeTab, searchTerm, pageSize]",
  "[activeTab, searchTerm, pageSize, filterCreator]"
);

// 3. Add uniqueCreators
code = code.replace(
  "const designingTasks = useMemo(() => {",
  `const uniqueCreators = useMemo(() => {
    const creators = new Set<string>();
    tasks.forEach(t => {
      if (t.createdByName) creators.add(t.createdByName);
    });
    return Array.from(creators).sort();
  }, [tasks]);

  const designingTasks = useMemo(() => {`
);

// 4. Create filteredWaitingTasks
code = code.replace(
  "const filteredSapoTasks = useMemo(() => {",
  `const filteredWaitingTasks = useMemo(() => {
    let result = waitingTasks;
    if (filterCreator !== 'ALL') {
      result = result.filter(t => t.createdByName === filterCreator);
    }
    if (!searchTerm.trim()) return result;
    const term = searchTerm.trim().toLowerCase();
    return result.filter(t => 
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.sapoOrderCode && t.sapoOrderCode.toLowerCase().includes(term)) ||
      (t.updatedByName && t.updatedByName.toLowerCase().includes(term)) ||
      (t.createdByName && t.createdByName.toLowerCase().includes(term))
    );
  }, [waitingTasks, searchTerm, filterCreator]);

  const filteredSapoTasks = useMemo(() => {`
);

// 5. Update filteredSapoTasks and filteredNoOrderTasks
code = code.replace(
  "const filteredSapoTasks = useMemo(() => {\n    if (!searchTerm.trim()) return allSapoTasks;",
  `const filteredSapoTasks = useMemo(() => {
    let result = allSapoTasks;
    if (filterCreator !== 'ALL') {
      result = result.filter(t => t.createdByName === filterCreator);
    }
    if (!searchTerm.trim()) return result;`
);
code = code.replace(
  "return allSapoTasks.filter(t =>",
  "return result.filter(t =>"
);
code = code.replace(
  "}, [allSapoTasks, searchTerm]);",
  "}, [allSapoTasks, searchTerm, filterCreator]);"
);

code = code.replace(
  "const filteredNoOrderTasks = useMemo(() => {\n    if (!searchTerm.trim()) return allNoOrderTasks;",
  `const filteredNoOrderTasks = useMemo(() => {
    let result = allNoOrderTasks;
    if (filterCreator !== 'ALL') {
      result = result.filter(t => t.createdByName === filterCreator);
    }
    if (!searchTerm.trim()) return result;`
);
code = code.replace(
  "return allNoOrderTasks.filter(t =>",
  "return result.filter(t =>"
);
code = code.replace(
  "}, [allNoOrderTasks, searchTerm]);",
  "}, [allNoOrderTasks, searchTerm, filterCreator]);"
);

// 6. Pagination for WAITING
code = code.replace(
  "// Pagination for SAPO",
  `// Pagination for WAITING
  const paginatedWaitingTasks = useMemo(() => {
    if (pageSize === 0) return filteredWaitingTasks;
    const start = (currentPage - 1) * pageSize;
    return filteredWaitingTasks.slice(start, start + pageSize);
  }, [filteredWaitingTasks, currentPage, pageSize]);

  // Pagination for SAPO`
);

// 7. Update renderFilterAndPagination
code = code.replace(
  `// Pagination & Filter Toolbar Component for SAPO and NO_ORDER tabs
  const renderFilterAndPagination = (totalItems: number) => {`,
  `// Pagination & Filter Toolbar Component
  const renderFilterAndPagination = (totalItems: number) => {`
);

code = code.replace(
  "{/* Page Size Selector & Pagination */}",
  `{/* Creator Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Người tạo:</span>
          <select
            value={filterCreator}
            onChange={(e) => setFilterCreator(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[150px]"
          >
            <option value="ALL">Tất cả</option>
            {uniqueCreators.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {/* Page Size Selector & Pagination */}`
);

// 8. Add toolbar to WAITING_DEPOSIT
code = code.replace(
  "{/* Toolbar filter & search for SAPO_ORDERED & NO_ORDER tabs */}",
  `{/* Toolbar filter & search */}\n        {activeTab === 'WAITING_DEPOSIT' && renderFilterAndPagination(filteredWaitingTasks.length)}`
);

// 9. Use paginated list for WAITING_DEPOSIT
code = code.replace(
  `{activeTab === 'WAITING_DEPOSIT' && (
            waitingTasks.length > 0 ? (
              waitingTasks.map(renderTaskCard)
            ) : (
              <EmptyState message="Chưa có công việc trong mục Đợi cọc." />
            )
          )}`,
  `{activeTab === 'WAITING_DEPOSIT' && (
            paginatedWaitingTasks.length > 0 ? (
              paginatedWaitingTasks.map(renderTaskCard)
            ) : (
              <EmptyState message={searchTerm || filterCreator !== 'ALL' ? "Không tìm thấy công việc nào khớp với bộ lọc." : "Chưa có công việc trong mục Đợi cọc."} />
            )
          )}`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
