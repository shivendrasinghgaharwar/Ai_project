import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, LogOut, ChevronDown, BookOpen, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

export function Header({ onCourseClick }: { onCourseClick?: (course: any) => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name?: string; target_goal?: string } | null>(null);
  const [email, setEmail] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setEmail(session.user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('full_name, target_goal')
        .eq('id', session.user.id)
        .single();
      if (data) setProfile(data);
    };
    loadUser();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await apiClient.searchCourses(value);
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleResultClick = (course: any) => {
    setShowResults(false);
    setSearchQuery('');
    if (onCourseClick) {
      onCourseClick(course);
    } else {
      navigate(`/dashboard/courses/${course.course_id}`);
    }
  };

  // Derive initials from full_name, fall back to email first letter
  const displayName = profile?.full_name || email.split('@')[0] || 'Student';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const subtitle = profile?.target_goal || 'Learning Dashboard';

  return (
    <motion.header
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 0 24px 0',
      }}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
    >
      {/* Search Bar */}
      <div ref={searchRef} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--surface)', padding: '11px 22px', borderRadius: 24,
          width: 320, border: '1px solid var(--outline-variant)',
          transition: 'all 0.3s ease',
          ...(showResults && searchResults.length > 0 ? {
            borderColor: 'var(--primary)',
            boxShadow: '0 4px 20px rgba(91,140,90,0.10)',
          } : {}),
        }}>
          {isSearching ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              style={{ width: 17, height: 17, flexShrink: 0 }}
            >
              <Search size={17} color="var(--primary)" />
            </motion.div>
          ) : (
            <Search size={17} color="var(--on-surface-variant)" />
          )}
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--on-surface)',
              outline: 'none', width: '100%', fontFamily: 'var(--font-body)', fontSize: 14,
            }}
          />
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--on-surface-variant)', padding: 2, flexShrink: 0,
              }}
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showResults && (searchResults.length > 0 || isSearching) && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                marginTop: 8, background: 'var(--surface)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 16, overflow: 'hidden', zIndex: 200,
                boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
                maxHeight: 380, overflowY: 'auto',
              }}
            >
              {isSearching ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--on-surface-variant)' }}>
                  Searching...
                </div>
              ) : (
                searchResults.map((course, i) => (
                  <motion.div
                    key={course.course_id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleResultClick(course)}
                    style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', borderBottom: '1px solid var(--outline-variant)',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-high)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'var(--primary-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <BookOpen size={16} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                        {course.category} · {course.difficulty}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side: Bell + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            border: '1px solid var(--outline-variant)', cursor: 'pointer',
          }}
        >
          <Bell size={18} />
        </motion.div>

        {/* Avatar + Name + Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--primary-container)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15, color: 'var(--primary)',
              fontFamily: 'var(--font-display)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{subtitle}</div>
            </div>
            <ChevronDown size={16} color="var(--on-surface-variant)" style={{ transition: 'transform 0.2s', transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 10,
                  background: 'var(--surface)', border: '1px solid var(--outline-variant)',
                  borderRadius: 16, padding: 8, minWidth: 180, zIndex: 100,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  onClick={() => { setShowMenu(false); navigate('/dashboard/settings'); }}
                  style={{
                    padding: '10px 14px', fontSize: 14, borderRadius: 10,
                    cursor: 'pointer', color: 'var(--on-surface)', fontWeight: 500,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--surface-high)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  ⚙️ Settings & Profile
                </div>
                <div style={{ height: 1, background: 'var(--outline-variant)', margin: '4px 0' }} />
                <div
                  onClick={handleSignOut}
                  style={{
                    padding: '10px 14px', fontSize: 14, borderRadius: 10,
                    cursor: 'pointer', color: '#E53E3E', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#FFF5F5')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} /> Sign Out
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
