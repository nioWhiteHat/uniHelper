
import { Outlet, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import DashboardMenuTesting from './FeedPage/DashboardMenu';

const ProtectedLayout = () => {
  const token = localStorage.getItem('token');


  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <SocketProvider>
      
      <DashboardMenuTesting>
        <Outlet />
      </DashboardMenuTesting>
       
    </SocketProvider>
  );
};

export default ProtectedLayout;