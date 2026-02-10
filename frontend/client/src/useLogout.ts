import { useNavigate } from "react-router-dom";
import { useSocket } from "./context/SocketContext"; // Adjust path
import { useMyId } from "./context/me";     // Adjust path

export const useLogout = () => {
    const navigate = useNavigate();
    const { socket } = useSocket();
    

    const logout = () => {
        // 1. Clear Local Storage
        localStorage.removeItem("token");

        // 2. Clear User Context (Set ID to 0 or null)
        

        // 3. Disconnect Socket
        if (socket) {
            // This manually kills the connection
            socket.disconnect(); 
            
            // Optional: If you want to ensure it doesn't auto-reconnect immediately
            // socket.close(); 
        }

        // 4. Redirect to Login Page
        navigate("/signin");
        
        console.log("User logged out successfully");
    };

    return logout;
};