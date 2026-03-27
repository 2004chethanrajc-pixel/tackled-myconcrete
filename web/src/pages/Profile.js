import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme");
      setIsDarkMode(currentTheme !== "light");
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  // Fetch fresh profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/auth/me`);
        if (response.data.success && response.data.data?.user) {
          updateUser(response.data.data.user);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [updateUser]);

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) {
      return;
    }

    try {
      setLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (error) {
      alert('Failed to logout. Please try again.');
      setLoggingOut(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      project_manager: 'Project Manager',
      finance: 'Finance Manager',
      site_incharge: 'Site Incharge',
      customer: 'Customer',
    };
    return roleNames[role] || role;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      super_admin: 'fa-crown',
      admin: 'fa-shield-alt',
      project_manager: 'fa-user-tie',
      finance: 'fa-chart-line',
      site_incharge: 'fa-hard-hat',
      customer: 'fa-user',
    };
    return roleIcons[role] || 'fa-user';
  };

  const getRoleColor = (role) => {
    const roleColors = {
      super_admin: '#8B5CF6',
      admin: '#3B82F6',
      project_manager: '#F59E0B',
      finance: '#10B981',
      site_incharge: '#EF4444',
      customer: '#6B7280',
    };
    return roleColors[role] || '#3B82F6';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Not provided';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Not provided';
    }
  };

  const roleColor = getRoleColor(user?.role);
  const roleIcon = getRoleIcon(user?.role);
  const roleDisplayName = getRoleDisplayName(user?.role);

  // Prepare user stats
  const userStats = {
    totalProjects: user?.total_projects || 0,
    activeProjects: user?.active_projects || 0,
    completedProjects: user?.completed_projects || 0,
    memberSince: formatDate(user?.created_at),
  };

  // Personal information items
  const personalInfoItems = [
    {
      icon: 'fa-envelope',
      label: 'Email Address',
      value: user?.email,
      href: user?.email ? `mailto:${user.email}` : null,
      color: '#3B82F6',
    },
    {
      icon: 'fa-phone',
      label: 'Phone Number',
      value: user?.phone || 'Not provided',
      href: user?.phone ? `tel:${user.phone}` : null,
      color: '#10B981',
    },
    {
      icon: 'fa-calendar-day',
      label: 'Date of Joining',
      value: formatDate(user?.date_of_joining),
      color: '#8B5CF6',
    },
    {
      icon: 'fa-birthday-cake',
      label: 'Date of Birth',
      value: formatDate(user?.date_of_birth),
      color: '#EC4899',
    },
    {
      icon: 'fa-map-marker-alt',
      label: 'City',
      value: user?.city || 'Not provided',
      color: '#F59E0B',
    },
    {
      icon: 'fa-home',
      label: 'Current Address',
      value: user?.current_address || 'Not provided',
      color: '#3B82F6',
    },
    {
      icon: 'fa-building',
      label: 'Permanent Address',
      value: user?.permanent_address || 'Not provided',
      color: '#10B981',
    },
    {
      icon: 'fa-clock',
      label: 'Last Login',
      value: formatDateTime(user?.last_login),
      color: '#8B5CF6',
    },
    {
      icon: 'fa-check-circle',
      label: 'Account Status',
      value: user?.is_active ? 'Active' : 'Inactive',
      color: user?.is_active ? '#10B981' : '#EF4444',
    },
  ];

  return (
    <div className={isDarkMode ? "dark-theme profile-wrapper" : "light-theme profile-wrapper"}>
      <div className="profile-container">
        {/* Profile Header with Gradient */}
        <div 
          className="profile-banner"
          style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}CC)` }}
        >
          <div className="banner-content">
            <div className="avatar-area">
              <div className="avatar-circle">
                {user?.name ? (
                  <span className="avatar-initials">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <i className="fas fa-user-circle"></i>
                )}
              </div>
              <div className="role-tag" style={{ backgroundColor: roleColor }}>
                <i className={`fas ${roleIcon}`}></i>
                <span className="role-text">{roleDisplayName}</span>
              </div>
            </div>
            
            <h1 className="profile-fullname">{user?.name}</h1>
            <p className="profile-email"><a href={`mailto:${user?.email}`} style={{ color: 'inherit' }}>{user?.email}</a></p>
            
           
            
            <div className="member-info">
              <i className="fas fa-calendar-alt"></i>
              <span>Member since {userStats.memberSince}</span>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="banner-decoration-1"></div>
          <div className="banner-decoration-2"></div>
        </div>

        <div className="profile-content-area">
          {loadingProfile ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Personal Information Card */}
              <div className="info-panel">
                <div className="panel-head">
                  <div className="panel-title">
                    <i className="fas fa-user-circle"></i>
                    <h2>Personal Information</h2>
                  </div>
                  <div className="panel-badge">
                    <i className="fas fa-id-card"></i>
                    <span>Profile Details</span>
                  </div>
                </div>
                
                <div className="panel-body">
                  <div className="info-list">
                    {personalInfoItems.map((item, index) => (
                      <div key={index} className="info-item">
                        <div className="info-left">
                          <div 
                            className="info-icon-box"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <i className={`fas ${item.icon}`} style={{ color: item.color }}></i>
                          </div>
                          <span className="info-label-text">{item.label}</span>
                        </div>
                        <span className="info-value-text">
                          {item.href
                            ? <a href={item.href}>{item.value}</a>
                            : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

          
            
                </>
          )}

          {/* Logout Button */}
          <div className="logout-area">
            <button 
              className="logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>

          {/* App Version */}
          <div className="version-footer">
            <p className="version-text">Version 2.0.0</p>
            <p className="copyright-info">© 2024 Construction Management System</p>
            <p className="support-link">
              <i className="fas fa-headset"></i>
              Need help? Contact support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;