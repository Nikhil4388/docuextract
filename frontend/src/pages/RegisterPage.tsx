import { Navigate } from 'react-router-dom';

// Registration is handled via Google Sign-In
export default function RegisterPage() {
  return <Navigate to="/login" replace />;
}
