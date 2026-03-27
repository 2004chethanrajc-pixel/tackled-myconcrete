import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
BarChart,
Bar,
PieChart,
Pie,
Cell,
Tooltip,
XAxis,
ResponsiveContainer
} from "recharts";

import "./Dashboard.css";

const Dashboard = () => {
const { user } = useAuth();
const navigate = useNavigate();

const [loading,setLoading] = useState(true);

const [stats,setStats] = useState({
totalProjects:0,
activeProjects:0,
completedProjects:0,
projects:[],
users:[],
totalUsers:0,
activeUsers:0,
inactiveUsers:0
});

/* ---------------- THEME ---------------- */
const [isDarkMode, setIsDarkMode] = useState(false);

// Initialize theme from localStorage
useEffect(() => {
  const savedTheme = localStorage.getItem("theme");
  setIsDarkMode(savedTheme !== "light");
}, []);

// Listen for theme changes from Layout
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

/* ---------------- FETCH DATA ---------------- */

useEffect(()=>{
fetchStats();
},[]);

const fetchStats = async () => {
try{
const [projRes,userRes] = await Promise.all([
api.get(`/projects`),
api.get(`/users`)
]);

const projects = projRes.data.data.projects || [];
const users = userRes.data.data.users || [];

// Calculate user statistics
const totalUsers = users.length;
const activeUsers = users.filter(u => u.is_active).length;
const inactiveUsers = users.filter(u => !u.is_active).length;

setStats({
totalProjects:projects.length,
activeProjects:projects.filter(
p=>!["CLOSED","COMPLETED"].includes(p.status)
).length,
completedProjects:projects.filter(
p=>["CLOSED","COMPLETED"].includes(p.status)
).length,
projects,
users,
totalUsers,
activeUsers,
inactiveUsers
});

}catch(err){

console.error("Dashboard error:",err);

}finally{

setLoading(false);

}

};

const chartData=[
{name:"Total",value:stats.totalProjects,color:"#6366F1"},
{name:"Active",value:stats.activeProjects,color:"#F59E0B"},
{name:"Done",value:stats.completedProjects,color:"#10B981"}
];

if(loading){
return <div className="dashboard-loading">Loading Dashboard...</div>;
}

const renderRoleDashboard = () => {

  switch (user?.role) {

    case "super_admin":
      return (
        <>
          <div className="dashboard-section">
            <h2 className="section-title">Super Admin Controls</h2>

            <div className="cards-grid">

              <div
                className="dashboard-card"
                onClick={() => navigate("/create-admin")}
              >
                <i className="fas fa-user-plus card-icon"></i>
                <div className="card-title">Add New Admin</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/create-super-admin")}
              >
                <i className="fas fa-user-shield card-icon"></i>
                <div className="card-title">Add Super Admin</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/audit-logs")}
              >
                <i className="fas fa-clipboard-list card-icon"></i>
                <div className="card-title">Audit Logs</div>
              </div>

            </div>
          </div>
        </>
      );


    case "admin":
      return (
        <>
          <div className="dashboard-section">

            <h2 className="section-title">Project Management</h2>

            <div className="cards-grid">

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-clipboard-list card-icon"></i>
                <div className="card-count">{stats.totalProjects}</div>
                <div className="card-title">Total Projects</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-play-circle card-icon"></i>
                <div className="card-count">{stats.activeProjects}</div>
                <div className="card-title">Active Projects</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-check-circle card-icon"></i>
                <div className="card-count">{stats.completedProjects}</div>
                <div className="card-title">Completed Projects</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/audit-logs")}
              >
                <i className="fas fa-clipboard-list card-icon"></i>
                <div className="card-title">Audit Logs</div>
              </div>

            </div>
          </div>
        </>
      );


    case "finance":
      return (
        <>
          <div className="dashboard-section">

            <h2 className="section-title">Finance Overview</h2>

            <div className="cards-grid">

              <div
                className="dashboard-card"
                onClick={() => navigate("/payments")}
              >
                <i className="fas fa-rupees-sign card-icon"></i>
                <div className="card-count">{stats.pendingPayments}</div>
                <div className="card-title">Pending Payments</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/quotations")}
              >
                <i className="fas fa-file-invoice card-icon"></i>
                <div className="card-count">{stats.projectsWithQuotations?.length || 0}</div>
                <div className="card-title">Quotations</div>
              </div>

            </div>
          </div>
        </>
      );


    case "project_manager":
      return (
        <>
          <div className="dashboard-section">

            <h2 className="section-title">My Projects</h2>

            <div className="cards-grid">

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-clipboard-list card-icon"></i>
                <div className="card-count">{stats.totalProjects}</div>
                <div className="card-title">Total Projects</div>
              </div>

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-play-circle card-icon"></i>
                <div className="card-count">{stats.activeProjects}</div>
                <div className="card-title">Active Projects</div>
              </div>

            </div>

          </div>
        </>
      );


    case "customer":
      return (
        <>
          <div className="dashboard-section">

            <h2 className="section-title">My Projects</h2>

            <div className="cards-grid">

              <div
                className="dashboard-card"
                onClick={() => navigate("/projects")}
              >
                <i className="fas fa-clipboard-list card-icon"></i>
                <div className="card-count">{stats.totalProjects}</div>
                <div className="card-title">Total Projects</div>
              </div>

            </div>

          </div>
        </>
      );


    default:
      return null;
  }

};

return (

<div className={isDarkMode ? "dark-theme dashboard-main" : "light-theme dashboard-main"}>

<motion.div
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
transition={{duration:0.4}}

>

{/* -------- KPI -------- */}

<section className="kpi-section">

{chartData.map((item,i)=>(
<motion.div
key={i}
className="kpi-card"
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
transition={{delay:i*0.1}}

>

<span>{item.name}</span>

<h2>{item.value}</h2>

</motion.div>
))}

{/* -------- USERS KPI CARD - ONLY VISIBLE FOR ADMIN/SUPER ADMIN -------- */}
{(user?.role === 'admin' || user?.role === 'super_admin') && (
  <motion.div
    className="kpi-card users-card-large"
    initial={{opacity:0,y:20}}
    animate={{opacity:1,y:0}}
    transition={{delay:0.3}}
    onClick={() => navigate("/users")}
  >
    <div className="users-card-content">
      <div className="users-card-header">
        <i className="fas fa-users users-card-icon"></i>
        <span className="users-card-title">User Management</span>
      </div>
      <div className="users-stats-grid">
        <div className="users-stat-item">
          <span className="users-stat-label">Total</span>
          <span className="users-stat-value total">{stats.totalUsers}</span>
        </div>
        <div className="users-stat-item">
          <span className="users-stat-label">Active</span>
          <span className="users-stat-value active">{stats.activeUsers}</span>
        </div>
        <div className="users-stat-item">
          <span className="users-stat-label">Inactive</span>
          <span className="users-stat-value inactive">{stats.inactiveUsers}</span>
        </div>
      </div>
      <div className="users-card-footer">
        <span className="users-click-hint">Click to manage all users</span>
        <i className="fas fa-arrow-right users-arrow"></i>
      </div>
    </div>
  </motion.div>
)}

</section>

{/* -------- CHARTS -------- */}

<section className="analytics">

<div className="chart-card">

<h3>Project Distribution</h3>
<Tooltip
  contentStyle={{
    background: isDarkMode ? "#0f172a" : "#ffffff",
    border: "none",
    borderRadius: "8px",
    boxShadow: isDarkMode ? "0 10px 25px rgba(0,0,0,0.4)" : "0 10px 25px rgba(0,0,0,0.1)"
  }}
/>
<ResponsiveContainer width="100%" height={250}>
  <BarChart data={chartData}>

    <defs>

      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.8}/>
      </linearGradient>

      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
        <stop offset="100%" stopColor="#D97706" stopOpacity={0.8}/>
      </linearGradient>

      <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
        <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
      </linearGradient>

      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
      </filter>

    </defs>

    <XAxis dataKey="name" tick={{ fill: isDarkMode ? '#94a3b8' : '#475569' }}/>
    <Tooltip/>

    <Bar
      dataKey="value"
      radius={[10,10,0,0]}
      filter="url(#shadow)"
    >
      <Cell fill="url(#colorTotal)" />
      <Cell fill="url(#colorActive)" />
      <Cell fill="url(#colorDone)" />
    </Bar>

  </BarChart>
</ResponsiveContainer>

</div>

<div className="chart-card">

<h3>Status Ratio</h3>

<ResponsiveContainer width="100%" height={250}>
  <PieChart>

    <defs>

      <filter id="pieShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.4"/>
      </filter>

    </defs>

    <Pie
      data={chartData}
      innerRadius={55}
      outerRadius={85}
      paddingAngle={5}
      dataKey="value"
      filter="url(#pieShadow)"
    >

      {chartData.map((entry,index)=>(
        <Cell key={index} fill={entry.color}/>
      ))}

    </Pie>

    <Tooltip/>

  </PieChart>
</ResponsiveContainer>

</div>

</section>

{/* -------- BOTTOM GRID -------- */}

<section className="bottom-grid">

{/* LIVE PROJECTS */}

<div className="panel">

<div className="panel-header">
<h3>Live Projects</h3>
<button onClick={()=>navigate("/projects")}>View All</button>
</div>

<div className="panel-content">

{stats.projects.slice(0,5).map(p => (

<div
key={p.id}
className="project-row"
onClick={()=>navigate(`/projects/${p.id}`)}
>

<div className="project-info">

<strong className="project-name">
{p.name}
</strong>

<span className="project-location">
<i className="fas fa-map-marker-alt"></i>
{p.location}
</span>

</div>

<span
className={`status-pill ${p.status.toLowerCase()}`}
>

{p.status.replace("_"," ")}

</span>

</div>

))}

</div>

</div>


{/* ACTIVITY */}

<div className="panel">

<div className="panel-header">
<h3>Recent Activity</h3>
</div>

<div className="activity-list">

{stats.projects.slice(0,5).map(p => (

<div key={p.id} className="activity-row">

<div className="activity-dot"></div>

<div className="activity-text">
Project <strong>{p.name}</strong> updated
</div>

</div>

))}

</div>

</div>


{/* INSIGHTS */}

<div className="panel">

<div className="panel-header">
<h3>Insights</h3>
</div>

<div className="insight-box">

<div className="insight-card">

<div className="insight-icon">
<i className="fas fa-bolt"></i>
</div>

<div>
<strong>{stats.activeProjects}</strong>
<span>Active Projects</span>
</div>

</div>

<div className="insight-card">

<div className="insight-icon success">
<i className="fas fa-check-circle"></i>
</div>

<div>
<strong>{stats.completedProjects}</strong>
<span>Completed</span>
</div>

</div>

</div>

</div>

</section>

{/* Role-specific Dashboard Sections */}
{renderRoleDashboard()}

</motion.div>

</div>

);

};

export default Dashboard;