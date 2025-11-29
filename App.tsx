import React, { useState, useEffect } from 'react';
import YsaRegistration from './components/YsaRegistration';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

type ViewState = 'registration' | 'login' | 'dashboard';
type UserRole = 'admin' | 'viewer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('registration');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin');

  useEffect(() => {
    // Check for persisted login and role
    const persistedRole = localStorage.getItem('ysa_auth_role');
    
    // Legacy support: checks old key, defaults to admin if found, then migrates
    const legacyAuth = localStorage.getItem('ysa_admin_auth') === 'true';

    if (persistedRole === 'admin' || persistedRole === 'viewer') {
        setIsAuthenticated(true);
        setUserRole(persistedRole as UserRole);
        setCurrentView('dashboard');
    } else if (legacyAuth) {
        // Migrate legacy auth to new role-based system
        setIsAuthenticated(true);
        setUserRole('admin');
        localStorage.setItem('ysa_auth_role', 'admin');
        localStorage.removeItem('ysa_admin_auth');
        setCurrentView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (role: UserRole) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('ysa_auth_role');
    localStorage.removeItem('ysa_admin_auth'); // Cleanup legacy
    setIsAuthenticated(false);
    setUserRole('admin'); // Reset to default
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'registration' && (
        <YsaRegistration onAdminClick={() => setCurrentView('login')} />
      )}
      
      {currentView === 'login' && (
        <AdminLogin 
          onLoginSuccess={handleLoginSuccess} 
          onBack={() => setCurrentView('registration')}
        />
      )}
      
      {currentView === 'dashboard' && isAuthenticated && (
        <AdminDashboard onLogout={handleLogout} role={userRole} />
      )}
      
      {/* Fallback protection if dashboard is accessed without auth */}
      {currentView === 'dashboard' && !isAuthenticated && (
        <AdminLogin 
          onLoginSuccess={handleLoginSuccess} 
          onBack={() => setCurrentView('registration')}
        />
      )}
    </div>
  );
};

export default App;