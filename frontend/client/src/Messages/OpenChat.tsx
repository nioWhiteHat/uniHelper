import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../config";
import { useSocket } from "../context/SocketContext";
import Post from "../FeedPage/Post";
import { useMyId } from "../context/me";
import "./OpenChat.css";

// ... [Keep all your interfaces exactly as they were] ...
export interface PostContent {
  image: string | null;
  title: string;
  description: string;
  creator_id: number;
  date: string;
  creator: string;
  creator_image: string | null;
  total_likes: number;
  total_dislikes: number;
  interest_labels: string[] | null;
  lesson_labels: string[] | null;
  last_comment: string | null;
}
interface Message {
  id: number;
  text: string | null;
  post_id: number | null;
  student_id: number;
  chat_id: number;
  date: string;
  reply_id: number | null;
  reactions: string | null;
  name: string;
  image: string;
  post_content: PostContent | null;
}
interface MessageToSend {
  chatId: number;
  messageText: string | null;
  postId: number | null;
  replyId: number | null;
  reaction: string | null;
}
interface chatinfo {
  members_id: number[];
  chat_name: string;
  chat_image: string;
  student_data: student[];
}
interface student {
  id: number;
  name: string;
  image: string;
  lastname: string;
}
interface GeneralResponse {
  messages: Message[];
  chatInfo: chatinfo;
}

export default function OpenChat() {
  const token = localStorage.getItem("token");
  const MyId = useMyId().id
  console.log(`MyId is this::${MyId}`)

  const { chatId } = useParams();
  const { socket } = useSocket();
  const [newMessageText, setNewMessageText] = useState("");

  const [generalResponse, setGeneralResponse] = useState<GeneralResponse>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [scroller, setScroller] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  
  const joinedRoomRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  console.log(messages);
  const getpost = async (postId: number) => {
    try {
      const response = await fetch(`${API_URL}/GetPost/${postId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("couldnt fetch post");
      return await response.json();
    } catch (err) {
      console.log(err);
      return null;
    }
  };

 
  useEffect(() => {
    if (!socket || !chatId) return;

    
    if (socket.connected && joinedRoomRef.current !== chatId) {
      console.log(`Joining chat_${chatId}...`);
      socket.emit("join_chat", chatId);
      joinedRoomRef.current = chatId;
    }

    const handleNewMessage = async (socketData: any) => {
      console.log("New message received:", socketData);

      let postdata: PostContent | null = null;
      if (socketData.postId != null) {
        postdata = await getpost(socketData.postId);
      }

      const newMessage: Message = {
        id: socketData.messageId,
        text: socketData.text,
        post_id: socketData.postId,
        student_id: socketData.senderId,
        chat_id: Number(chatId),
        date: socketData.date,
        reply_id: socketData.replyId,
        reactions: socketData.reaction,
        name: socketData.senderName,
        image: socketData.senderImage,
        post_content: postdata,
      };

      
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [newMessage, ...prev];
      });
    };

    socket.on("new_message", handleNewMessage);

    
    const handleConnect = () => {
      console.log("Socket re-connected, joining room...");
      socket.emit("join_chat", chatId);
    };
    socket.on("connect", handleConnect);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("connect", handleConnect);
      
      if (socket.connected) {
        socket.emit("leave_chat", chatId);
        joinedRoomRef.current = null;
      }
    };
  }, [chatId, socket]);

  
  useEffect(() => {
    if (!chatId) return; 

    setLoading(true);
    fetch(`${API_URL}/GetChatLog/${chatId}/${scroller}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("error fetching log");
        return await response.json();
      })
      .then((data: GeneralResponse) => {
        if (scroller === 0) {
          setGeneralResponse(data);
          
          setMessages(data.messages);
        } else {
          
          if (data.messages.length > 0) {
            setMessages((prev) => {
              const newMsgs = data.messages.filter(
                (newMsg) => !prev.some((existing) => existing.id === newMsg.id),
              );
              return [...prev, ...newMsgs];
            });
          }
        }
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, [scroller, chatId]); 

  
  useEffect(() => {
    const handleScroll = () => {
      const container = scrollRef.current;
      if (!container) return;
      const { scrollTop, clientHeight, scrollHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 20 && !loading) {
        setScroller((prev) => prev + 1);
      }
    };

    const container = scrollRef.current;
    if (container) container.addEventListener("scroll", handleScroll);

    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
    };
  }, [loading]); 
 
  useEffect(() => {
    setMessages([]);
    setScroller(0);
    setGeneralResponse(undefined);
    joinedRoomRef.current = null; 
  }, [chatId]);

  const handleSendText = () => {
    if (!newMessageText.trim() || !chatId) return;

    const payload: MessageToSend = {
      chatId: Number(chatId),
      messageText: newMessageText,
      postId: null,
      replyId: null,
      reaction: null,
    };

    
    fetch(`${API_URL}/SendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Send failed", err));

    setNewMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendText();
  };

  return (
    <div className="ChatMainContainer">
      <div ref={scrollRef} className="ChatLogContainer">
        
        {loading && scroller === 0 ? (
          <div>loading messages...</div>
        ) : (
          <>
            {messages.map((m) => {
             
              const sender = generalResponse?.chatInfo.student_data.find(
                (s) => s.id === m.student_id,
              );

              if (m.reactions != null) return null;

              return (
                <div
                  key={m.id}
                  className={
                    m.student_id === MyId ? "MyMessage" : "OthersMessage"
                  }
                >
                  <div className="SenderImageContainer">
                    <img
                      className="SenderImage"
                      src={sender?.image || ""}
                      alt="sender"
                    />
                  </div>
                  <span className="SenderName">{sender?.name}</span>

                  {m.post_id != null ? (
                    (() => {
                      const content = m.post_content;
                      if (content) {
                        const postData = {
                          student: {
                            id: content.creator_id,
                            name: content.creator,
                            image: content.creator_image || "",
                          },
                          id: m.post_id!,
                          title: content.title,
                          description: content.description,
                          image: content.image || "",
                          date: content.date,
                          interests_labels: content.interest_labels || [],
                          lessons_labels: content.lesson_labels || [],
                          total_likes: content.total_likes,
                          total_dislikes: content.total_dislikes,
                          lastComment: null,
                        };
                        return (
                          <div className="Post">
                            <Post {...postData} />
                          </div>
                        );
                      } else {
                        return <div className="errorPost">error on post</div>;
                      }
                    })()
                  ) : (
                    <div className="MessageText">{m.text}</div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="ChatInputArea">
        <input
          type="text"
          className="ChatInput"
          placeholder="Type a message..."
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="SendButton" onClick={handleSendText}>
          Send
        </button>
      </div>
    </div>
  );
}
