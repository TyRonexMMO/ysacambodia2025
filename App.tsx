import React, { useState } from 'react';
import YsaRegistration from './components/YsaRegistration';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

type ViewState = 'registration' | 'login' | 'dashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('registration');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
        <AdminDashboard onLogout={handleLogout} />
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