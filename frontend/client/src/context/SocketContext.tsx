import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// 1. Define the Notification Interface (Same as in your other files)
export interface Notification {
  chatName: string;
  chatId: number;
  senderId: number;
  senderName: string;
  senderImage: string;
  messageText: string;
  // ... add other fields if needed for the popup
}

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const connectionRef = useRef<Socket | null>(null);

  // --- NEW: Notification State ---
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  // -------------------------------

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || connectionRef.current) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket']
    });

    connectionRef.current = newSocket;
    setSocket(newSocket);

    // --- NEW: Global Listener for Popups ---
    const handleGlobalNotification = (data: Notification) => {
      console.log("Global Notification Received:", data);
      
      // 1. Show the popup
      setActiveNotification(data);

      // 2. Hide it after 3 seconds
      setTimeout(() => {
        setActiveNotification(null);
      }, 3000);
    };

    newSocket.on("chat_notification", handleGlobalNotification);

    return () => {
        newSocket.off("chat_notification", handleGlobalNotification);
        newSocket.disconnect();
        connectionRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}

      {/* --- NEW: The Popup Component (Rendered on top of everything) --- */}
      {activeNotification && (
        <div style={popupStyles.container}>
            <div style={popupStyles.content}>
                <img 
                    src={activeNotification.senderImage || "/default.png"} 
                    alt="" 
                    style={popupStyles.image} 
                />
                <div>
                    <h4 style={popupStyles.title}>{activeNotification.chatName || activeNotification.senderName}</h4>
                    <p style={popupStyles.message}>
                        <span style={{fontWeight:'bold'}}>{activeNotification.senderName}: </span>
                        {activeNotification.messageText}
                    </p>
                </div>
            </div>
        </div>
      )}
      {/* --------------------------------------------------------------- */}

    </SocketContext.Provider>
  );
};

// Simple inline styles for the popup (You can move this to CSS)
const popupStyles = {
    container: {
        position: 'fixed' as 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999, // Ensure it's on top of everything
        backgroundColor: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '300px',
        animation: 'slideIn 0.3s ease-out',
        borderLeft: '5px solid #0084ff'
    },
    content: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    image: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        objectFit: 'cover' as 'cover'
    },
    title: {
        margin: '0 0 4px 0',
        fontSize: '14px',
        color: '#050505'
    },
    message: {
        margin: 0,
        fontSize: '13px',
        color: '#65676b',
        whiteSpace: 'nowrap' as 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '220px'
    }
};