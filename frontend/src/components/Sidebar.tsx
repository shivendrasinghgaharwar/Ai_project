import { motion } from 'framer-motion';
import { Home, BookOpen, TrendingUp, Calendar, CheckSquare, HelpCircle, Settings, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { supabase } from '../lib/supabaseClient';

const NAV_ITEMS = [
  { path: '/dashboard',         end: true,  icon: Home,        label: 'Home' },
  { path: '/dashboard/courses', end: false, icon: BookOpen,    label: 'Courses' },
  { path: '/dashboard/progress',end: true,  icon: TrendingUp,  label: 'Progress' },
  { path: '/dashboard/schedule',end: true,  icon: Calendar,    label: 'Schedule' },
  { path: '/dashboard/tasks',   end: true,  icon: CheckSquare, label: 'Tasks' },
];

const BOTTOM_ITEMS = [
  { path: '/dashboard/support',  icon: HelpCircle, label: 'Support' },
  { path: '/dashboard/settings', icon: Settings,   label: 'Settings' },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '11px 14px', borderRadius: 14,
    display: 'flex', alignItems: 'center', gap: 12,
    fontWeight: isActive ? 700 : 500, fontSize: 14,
    color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
    background: isActive ? 'var(--primary-container)' : 'transparent',
    transition: 'all 0.3s ease',
    textDecoration: 'none'
  });

  return (
    <motion.aside
      style={{
        width: 220, background: 'var(--surface)', padding: '32px 16px',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--outline-variant)',
      }}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
    >
      <div style={{
        fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)',
        color: 'var(--primary)', marginBottom: 40, paddingLeft: 12,
        letterSpacing: '-0.02em',
      }}>
        LearnGo
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map(({ path, end, icon: Icon, label }) => (
          <AnimatedClickWrapper key={path}>
            <NavLink to={path} end={end} style={linkStyle}>
              {({ isActive }) => (
                <>
                  <Icon size={19} color={isActive ? "var(--primary)" : "currentColor"} />
                  {label}
                </>
              )}
            </NavLink>
          </AnimatedClickWrapper>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {BOTTOM_ITEMS.map(({ path, icon: Icon, label }) => (
          <AnimatedClickWrapper key={path}>
            <NavLink to={path} style={linkStyle}>
              {({ isActive }) => (
                <>
                  <Icon size={19} color={isActive ? "var(--primary)" : "currentColor"} />
                  {label}
                </>
              )}
            </NavLink>
          </AnimatedClickWrapper>
        ))}

        <AnimatedClickWrapper onClick={handleLogout}>
          <div style={{
            padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 14, fontWeight: 500, color: '#E53E3E', marginTop: 8, cursor: 'pointer',
          }}>
            <LogOut size={19} />
            Sign Out
          </div>
        </AnimatedClickWrapper>
      </div>
    </motion.aside>
  );
}
