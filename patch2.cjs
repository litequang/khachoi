const fs = require('fs');
let code = fs.readFileSync('src/components/Layout.tsx', 'utf8');

code = code.replace(
  "import { CreateTaskModal } from './CreateTaskModal';",
  "import { CreateTaskModal } from './CreateTaskModal';\nimport { ProfileModal } from './ProfileModal';"
);

code = code.replace(
  "const [isSettingsOpen, setIsSettingsOpen] = useState(false);",
  "const [isSettingsOpen, setIsSettingsOpen] = useState(false);\n  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);"
);

code = code.replace(
  "                  </div>\n                  {user.role === 'ADMIN' && (",
  `                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setIsSettingsOpen(false); setIsProfileModalOpen(true); }}
                      className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Settings className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-500" />
                      Hồ sơ của tôi
                    </button>
                  </div>
                  {user.role === 'ADMIN' && (`
);

code = code.replace(
  "{isCreateModalOpen && (\n        <CreateTaskModal onClose={() => setIsCreateModalOpen(false)} />\n      )}",
  `{isCreateModalOpen && (
        <CreateTaskModal onClose={() => setIsCreateModalOpen(false)} />
      )}
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}`
);

fs.writeFileSync('src/components/Layout.tsx', code);
