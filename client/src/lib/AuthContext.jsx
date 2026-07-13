import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/me', { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
    if (res.data.needsMfa) {
      return { needsMfa: true };
    }
    await checkAuth();
    return { success: true };
  };

  const googleLogin = async (credential) => {
    await axios.post('/api/auth/google/login', { credential }, { withCredentials: true });
    await checkAuth();
  };

  const googleCreateAccount = async (credential, role, country, branchId) => {
    const payload = { credential, role };
    if (country) payload.country = country;
    if (branchId) payload.branchId = branchId;
    await axios.post('/api/auth/google/create-account', payload, { withCredentials: true });
    await checkAuth();
  };

  const createUserByAdmin = async (data) => {
    await axios.post('/api/auth/create-user', data, { withCredentials: true });
  };

  const verifyMfa = async (email, code) => {
    await axios.post('/api/auth/mfa', { email, code }, { withCredentials: true });
    await checkAuth();
  };

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
    setUser(null);
  };

  const isCEO = user?.role === 'CEO';
  const isDirector = user?.role === 'DIRECTOR';
  const isHR = user?.role === 'HR';
  const isBranchAdmin = user?.role === 'BRANCH_ADMIN' || user?.role === 'ADMIN';
  const canEditLeads = isCEO || isDirector || isBranchAdmin;
  const canCreateAccounts = isCEO || isDirector;
  const canManageDirectors = isCEO;
  const canManageBranchAdmins = isCEO || isDirector;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        googleCreateAccount,
        createUserByAdmin,
        verifyMfa,
        logout,
        checkAuth,
        isCEO,
        isDirector,
        isHR,
        isBranchAdmin,
        canEditLeads,
        canCreateAccounts,
        canManageDirectors,
        canManageBranchAdmins,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
