import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientAPI } from '../../services/api';
import {
  MdLocalHospital, MdDashboard, MdCalendarToday, MdPeople, MdPerson,
  MdSchedule, MdMedicalServices, MdAnalytics, MdMenu,
  MdQueueMusic, MdLogout, MdSettings, MdAddCircle, MdNotifications
} from 'react-icons/md';
import { FiChevronRight } from 'react-icons/fi';

const ROLE_COLORS = {
  patient:      { badge: '#00BFA5', label: 'Patient'       },
  doctor:       { badge: '#7B1FA2', label: 'Doctor'        },
  receptionist: { badge: '#FB8C00', label: 'Receptionist'  },
  admin:        { badge: '#E53935', label: 'Admin'         },
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingFollowUps, setPendingFollowUps] = useState(0);

  // Load pending follow-up count for patients
  useEffect(() => {
    if (user?.role === 'patient') {
      patientAPI.getFollowUps()
        .then(r => {
          const pending = (r.data.followUps || []).filter(f => f.status === 'pending').length;
          setPendingFollowUps(pending);
        })
        .catch(() => {});
    }
  }, [user?.role, location.pathname]);

  const NAV_CONFIG = {
    patient: [
      { to: '/patient',              label: 'Dashboard',        icon: MdDashboard,    exact: true },
      { to: '/patient/book',         label: 'Book Appointment', icon: MdAddCircle                 },
      { to: '/patient/appointments', label: 'My Appointments',  icon: MdCalendarToday             },
      { to: '/patient/follow-ups',   label: 'Follow-ups',       icon: MdNotifications, badge: pendingFollowUps },
      { to: '/patient/profile',      label: 'My Profile',       icon: MdPerson                    },
    ],
    doctor: [
      { to: '/doctor',          label: 'Dashboard',     icon: MdDashboard,      exact: true },
      { to: '/doctor/queue',    label: "Today's Queue",  icon: MdQueueMusic                  },
      { to: '/doctor/patients', label: 'Patients',      icon: MdPeople                      },
      { to: '/doctor/schedule', label: 'My Schedule',   icon: MdSchedule                    },
    ],
    receptionist: [
      { to: '/receptionist',          label: 'Dashboard',      icon: MdDashboard, exact: true },
      { to: '/receptionist/walk-in',  label: 'Walk-in Booking',icon: MdAddCircle              },
    ],
    admin: [
      { to: '/admin',             label: 'Dashboard',       icon: MdDashboard,     exact: true },
      { to: '/admin/doctors',     label: 'Manage Doctors',  icon: MdMedicalServices            },
      { to: '/admin/departments', label: 'Departments',     icon: MdSettings                   },
    ],
  };

  const navItems = NAV_CONFIG[user?.role] || [];
  const roleInfo = ROLE_COLORS[user?.role] || {};
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  const currentNav = navItems.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 6, display: 'flex' }}>
            <MdLocalHospital size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'white', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>MediCare</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Hospital Management</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div style={{ margin: '10px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, background: 'rgba(255,255,255,0.2)', color: 'white', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <span style={{ background: roleInfo.badge, color: 'white', fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, display: 'inline-block', marginTop: 2 }}>
            {roleInfo.label}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        <div className="sidebar-section">Navigation</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={() => `sidebar-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: 'var(--warning)', color: 'white', minWidth: 18, height: 18, borderRadius: 9, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {item.badge}
                </span>
              )}
              {isActive && !item.badge && <FiChevronRight size={13} style={{ opacity: 0.6 }} />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-item" onClick={handleLogout} style={{ color: 'rgba(255,110,110,0.9)' }}>
          <MdLogout size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="app-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          />
          <aside style={{ position: 'fixed', top: 0, left: 0, width: 256, height: '100vh', background: '#0D47A1', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <SidebarContent />
          </aside>
        </>
      )}

      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(true)}
            style={{ marginRight: 4 }}
          >
            <MdMenu size={22} />
          </button>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: 'var(--text-primary)', fontWeight: 600 }}>
              {currentNav?.label || 'Dashboard'}
            </h3>
          </div>

          {/* Notification bell for patient */}
          {user?.role === 'patient' && pendingFollowUps > 0 && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate('/patient/follow-ups')}
              style={{ position: 'relative' }}
              title={`${pendingFollowUps} follow-up(s) need attention`}
            >
              <MdNotifications size={22} color="var(--warning)" />
              <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--warning)', color: 'white', width: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pendingFollowUps}
              </span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', display: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
            </div>
            <div
              className="avatar"
              style={{ width: 34, height: 34, fontSize: 13, cursor: 'pointer', background: 'var(--primary-50)', color: 'var(--primary)' }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
