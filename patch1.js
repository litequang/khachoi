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

fs.writeFileSync('src/pages/Dashboard.tsx', code);
