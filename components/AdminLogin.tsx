import React, { useState } from 'react';
import { LockKeyhole, ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

type UserRole = 'admin' | 'viewer';

interface AdminLoginProps {
  onLoginSuccess: (role: UserRole) => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // 1. Check Master Admin Credentials (Hardcoded Fallback)
    if (username === 'AdminYSACambodia2025' && password === 'AdminSouthStakeYSA') {
      completeLogin('admin');
      return;
    } 
    
    // 2. Check Master Viewer Credentials (Hardcoded Fallback)
    if (username === 'ViewerYSA' && password === 'ViewOnly2025') {
      completeLogin('viewer');
      return;
    }

    // 3. Check Database for Custom Users
    if (db) {
        try {
            const q = query(
                collection(db, "ysa_users"), 
                where("username", "==", username),
                where("password", "==", password) // Note: In production, hash check would go here
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                const role = userData.role as UserRole;
                completeLogin(role);
                return;
            }
        } catch (err) {
            console.error("Login Error:", err);
            // Continue to show error below
        }
    }

    setError('ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ');
    setIsLoading(false);
  };

  const completeLogin = (role: UserRole) => {
      if (rememberMe) {
        localStorage.setItem('ysa_auth_role', role);
      }
      setIsLoading(false);
      onLoginSuccess(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-green-900 flex items-center justify-center p-4 font-khmer">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-yellow-400/50">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-500 hover:text-red-700 mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> ត្រឡប់ក្រោយ
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-red-50">
            <LockKeyhole className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 font-moul">ការគ្រប់គ្រង</h2>
          <p className="text-gray-500 text-sm">សូមបញ្ចូលគណនីរបស់អ្នក</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">Username</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="flex items-center mb-2">
            <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                សូមចងចាំគណនីរបស់ខ្ញុំ
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded text-center border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition-all shadow-md mt-2 flex justify-center items-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ចូលប្រព័ន្ធ'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;