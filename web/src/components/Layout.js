import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  // Check if screen is mobile size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Apply theme class to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode-active');
      document.body.classList.remove('light-mode-active');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.add('light-mode-active');
      document.body.classList.remove('dark-mode-active');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    window.dispatchEvent(new Event('themeChange'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'home' },
    { path: '/projects', label: 'Projects', icon: 'project-diagram', roles: ['admin', 'project_manager', 'site_incharge', 'finance', 'customer'] },
    { path: '/users', label: 'Users', icon: 'users', roles: ['admin', 'super_admin'] },
    { path: '/create-admin', label: 'Add Admin', icon: 'user-plus', roles: ['super_admin'] },
    { path: '/create-super-admin', label: 'Add Super Admin', icon: 'user-shield', roles: ['super_admin'] },
    { path: '/audit-logs', label: 'Audit Logs', icon: 'clipboard-list', roles: ['super_admin', 'admin'] },
    { path: '/payments', label: 'Payments', icon: 'money-bill-wave', roles: ['finance', 'super_admin'] },
    { path: '/orders', label: 'Orders', icon: 'box', roles: ['admin', 'super_admin', 'finance'] },
    { path: '/quotations', label: 'Quotations', icon: 'indian-rupee-sign', roles: ['admin','super_admin','finance', 'customer'] },
    { path: '/reports', label: 'Reports', icon: 'file-alt', roles: ['admin', 'project_manager', 'site_incharge', 'finance', 'customer'] },
    { path: '/site-plans', label: 'Site Plans', icon: 'map', roles: ['admin', 'super_admin', 'finance'] },
    { path: '/profile', label: 'Profile', icon: 'user', roles: ['admin', 'project_manager', 'site_incharge', 'finance', 'customer', 'super_admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles) {
      return item.roles.includes(user?.role);
    }
    return true;
  });

  return (
    <div className={`layout-wrapper ${isDarkMode ? 'dark-layout' : 'light-layout'}`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <div className="mobile-logo">
            <img src="/logo.png" alt="MyConcrete" className="mobile-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button className="hamburger-button" onClick={toggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="desktop-header">
          <div className="desktop-header-left">
            <h2>Welcome back, {user?.name}</h2>
          </div>
          <div className="desktop-header-right">
            <div className="top-actions">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {isDarkMode ? "☀️" : "🌙"}
              </button>
              <div className="avatar">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isMobile ? 'sidebar-mobile' : 'sidebar-desktop'} ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        {isMobile && (
          <button className="sidebar-close" onClick={closeSidebar}>
            <i className="fas fa-times"></i>
          </button>
        )}

        <div className="sidebar-logo-section">
          <img src="/logo.png" alt="MyConcrete" className="sidebar-logo logo-glow" />
        </div>

        <div className="sidebar-profile-simple">
          <i className="fas fa-user profile-simple-icon"></i>
          <div className="profile-simple-info">
            <div className="profile-simple-name">{user?.name}</div>
            <div className="profile-simple-details">
              {user?.email} • {user?.role?.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <div className="sidebar-menu">
          {filteredMenuItems.map((item, index) => (
            <button
              key={index}
              className={`menu-item ${isActive(item.path) ? 'menu-item-active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <i className={`fas fa-${item.icon} menu-icon`}></i>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          <div className="menu-divider"></div>

          {isMobile && (
            <>
              <button className="menu-item sidebar-theme-toggle" onClick={toggleTheme}>
                <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} menu-icon`}></i>
                <span className="menu-label">
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
              <div className="menu-divider"></div>
            </>
          )}

          <button className="menu-item menu-item-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt menu-icon"></i>
            <span className="menu-label">Logout</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <p>Designed by Tackle-D</p>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${isMobile ? 'main-content-mobile' : 'main-content-desktop'}`}>
        <div className="main-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;