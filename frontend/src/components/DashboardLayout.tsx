import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WelcomeHero } from './WelcomeHero';
import { HorizontalTimetable } from './HorizontalTimetable';
import { TasksPanel } from './TasksPanel';
import { CourseDrawer } from './CourseDrawer';
import { Outlet, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';

export function DashboardLayout({ userId }: { userId: string }) {
  const [activeCourse, setActiveCourse] = useState<any | null>(null);
  const location = useLocation();
  const isHome = location.pathname === '/dashboard';

  // Extract drawer logic into a reusable handler that can be passed down
  const openCourseDrawer = (course: any) => {
    setActiveCourse(course);
  };

  return (
    <div style={{
      display: 'flex', width: '100vw', height: '100vh',
      background: 'var(--surface-base)', color: 'var(--on-surface)',
      overflow: 'hidden'
    }}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 32px 0 32px', overflowY: 'auto', overflowX: 'hidden' }}>
        <Header onCourseClick={openCourseDrawer} />

        <div style={{ paddingBottom: 64 }}>
          {/* If strictly at /dashboard, show Home view, else render child routes via Outlet */}
          <AnimatePresence mode="wait">
            {isHome ? (
              <HomeView key="home-view" userId={userId} openCourseDrawer={openCourseDrawer} />
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet context={{ userId, openCourseDrawer }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Course Detail Drawer Overlay */}
      <AnimatePresence>
        {activeCourse && (
          <CourseDrawer
            course={activeCourse}
            userId={userId}
            onClose={() => setActiveCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dashboard Home View ──────────────────────────────────────────────────────
function HomeView({ userId, openCourseDrawer }: { userId: string, openCourseDrawer: (course: any) => void }) {
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getTrendingCourses().then((data: any) => {
      if (data?.status === 'success') {
        setTrending(data.trending || []);
      }
    }).catch(console.error);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <WelcomeHero />
        <HorizontalTimetable />

        {/* Trending Section */}
        {trending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Popular Now</h3>
              <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>See All</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {trending.slice(0, 2).map((course) => (
                <div
                  key={course.course_id}
                  className="card-glass"
                  onClick={() => openCourseDrawer(course)}
                  style={{
                    padding: 20, cursor: 'pointer',
                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                    background: 'var(--primary)', opacity: 0.05, borderRadius: '50%'
                  }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>{course.category}</div>
                  <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{course.title}</h4>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                    🔥 {course.interaction_count} learners recently
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ borderLeft: '1px solid var(--outline-variant)', paddingLeft: 32 }}>
        <TasksPanel userId={userId} onCourseClick={openCourseDrawer} />
      </div>
    </motion.div>
  );
}
