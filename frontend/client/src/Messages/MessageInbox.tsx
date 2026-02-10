import { use, useEffect, useState } from "react";
import { API_URL } from "../config";
import { useSocket } from "../context/SocketContext";
import "./inbox.css"
import { Outlet, useNavigate } from "react-router-dom";
export interface Student {
  id: number;
  name: string;
  image: string | null;
}

export interface LastMessageInfo {
  id: number;
  text: string | null;
  reaction: string | null;
  post_id: number | null;
  sender_id: number;
  date: string;
  last_message_reaction: string | null;
  last_student: Student | null;
}

export interface Notification {
  chatName: string;
  chatId: number;
  senderId: number;
  senderName: string;
  senderImage: string;
  messageText: string;
  date: string;
  messageId: number;
  postId: number;
  replyId: number;
  reaction: string;
}

export interface Chat {
  chat_id: number;
  chat_name: string | null;
  updated_at: string;
  chat_image: string | null;
  is_personal: boolean;
  last_message_info: LastMessageInfo | null;
  member_details: Student[];
}

export default function MessageInbox() {
  const { socket } = useSocket();
  const token = localStorage.getItem("token");  
  const [chats, setChats] = useState<Chat[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const nav = useNavigate();
  useEffect(() => {
    let is_mounted = false;
    setLoading(true);
    fetch(`${API_URL}/GetChatInbox/${offset}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return await response.json();
      })
      .then((data) => {
        if(!is_mounted){
          is_mounted = true;
          setChats((prevChats) => [...prevChats, ...data.chats]);
          setLoading(false);
        }
        
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        setLoading(false);
      })
      .finally(()=>{
        setLoading(false)
      });
      
  }, [offset]);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } =
        document.documentElement;

      if (scrollTop + clientHeight >= scrollHeight - 20 && !loading) {
        setOffset((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = async (notificationData: Notification) => {
      console.log("Inbox update:", notificationData);

     
      const existingChat = chats.find((c) => c.chat_id === notificationData.chatId);

      if (!existingChat) {
       
        try {
          const response = await fetch(`${API_URL}/GetChat/${notificationData.chatId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) throw new Error("Could not fetch chat");
          
          const newChat: Chat = await response.json();


          setChats((prev) => [newChat, ...prev]);
        } catch (err) {
          console.error("Error fetching new chat:", err);
        }
      } else {
        setChats((prevChats) => {
          const oldChat = prevChats.find((c) => c.chat_id === notificationData.chatId);
          
          
          if (!oldChat) return prevChats; 

          const updatedChat: Chat = {
            ...oldChat,
            updated_at: notificationData.date,
            last_message_info: {
              ...(oldChat.last_message_info as LastMessageInfo),
              id: notificationData.messageId,
              text: notificationData.messageText,
              date: notificationData.date,
              sender_id: notificationData.senderId,
              post_id: notificationData.postId,
              reaction: notificationData.reaction,
              last_student: {
                id: notificationData.senderId,
                name: notificationData.senderName,
                image: notificationData.senderImage,
              },
            },
          };

          const otherChats = prevChats.filter((c) => c.chat_id !== notificationData.chatId);
          return [updatedChat, ...otherChats];
        });
      }
    };

    socket.on("chat_notification", handleNotification);

    return () => {
      socket.off("chat_notification", handleNotification);
    };
    
  }, [socket, chats]);
  const handleOpenChat = (chatId:number)=>{
    nav(`/Messages/${chatId}`)
  }

  return (
    <div className="InboxContainer">
      <div className="ChatsContainer">
        {loading && chats.length === 0 ? (
          <p>Loading chats...</p>
        ) : chats.length === 0 ? (
          <p>No chats available.</p>
        ) : (
          chats.map((chat) => (
            <>
              <div key={chat.chat_id} className="ChatItem" onClick={()=>{handleOpenChat(chat.chat_id)}}>
                <div className="ChatImageContainer">
                  <img
                    src={chat.chat_image ? chat.chat_image : ""}
                    alt="NoImage"
                    className="ChatImage"
                  />
                </div>
                <div className="NameLastMsgContainer">
                  <div className="ChatName">{chat.chat_name}</div>
                  <div className="LastMsg">
                    {(() => {
                      
                      const info = chat.last_message_info;
                      if (!info) return <span>No messages yet</span>;

                    
                      let content = "";
                      if (info.text) content = info.text;
                      else if (info.post_id) content = "Shared a post";
                      else if (info.reaction)
                        content = `Reacted: ${info.reaction}`;

                      
                      const senderName = !chat.is_personal
                        ? info.last_student?.name || "User"
                        : null;

                      return (
                        <>
                          <div className="message-preview">
                            {/* If it's a group chat, show "Name: " */}
                            {senderName && (
                              <span style={{ fontWeight: "bold" }}>
                                {senderName}:{" "}
                              </span>
                            )}

                            {/* Show the actual message content */}
                            <span>{content}</span>
                          </div>

                          {/* Show the Date (formatted simply) */}
                          <span className="message-date">
                            {new Date(info.date).toLocaleDateString()}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>
            </>
          ))
        )}
      </div>
      <div className="ChatRoomContainer">
        <Outlet/>
      </div>
    </div>
  );
}
