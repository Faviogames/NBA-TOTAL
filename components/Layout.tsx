
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Home, Table2, LineChart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/matches', label: 'Odds History', icon: <Table2 size={20} /> },
    { path: '/analytics', label: 'Team Analytics', icon: <BarChart3 size={20} /> },
    { path: '/simulator', label: 'Backtesting', icon: <LineChart size={20} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-primary text-textMain">
      {/* Sidebar */}
      <aside className="w-64 bg-secondary border-r border-slate-700 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            NBA BetIQ
          </h1>
          <p className="text-xs text-textMuted mt-1">Advanced Sports Analytics</p>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    location.pathname === item.path
                      ? 'bg-accent/10 text-accent border-r-4 border-accent'
                      : 'text-textMuted hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 text-xs text-center text-textMuted border-t border-slate-700">
          v1.0.0 &bull; Data Updated Daily
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="md:hidden bg-secondary p-4 border-b border-slate-700 flex justify-between items-center">
           <h1 className="text-xl font-bold text-accent">NBA BetIQ</h1>
           {/* Mobile menu could go here */}
        </header>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;