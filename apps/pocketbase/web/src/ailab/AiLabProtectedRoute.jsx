import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAiLabAuth } from './AiLabAuthContext';

const AiLabProtectedRoute = ({ children }) => {
  const { isAuthed, loading } = useAiLabAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!isAuthed) {
    return <Navigate to="/ai-lab/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
};

export default AiLabProtectedRoute;
