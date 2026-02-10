import { useEffect, useState } from "react"
import { API_URL } from "../config"
import "./SharePostPanel.css"

interface Chat {
    chat_id: number;
    chat_name: string;
    chat_image: string;
}

interface Props {
    postId: number;
}

const SharePostPanel = ({ postId }: Props) => {
    const token = localStorage.getItem("token")
    const [friends, setFriends] = useState<Chat[]>([])

    const [sentList, setSentList] = useState<number[]>([])

    useEffect(() => {
        const controller = new AbortController();

        fetch(`${API_URL}/GetChatInbox/0`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
        })
        .then(async (res) => {
            if (!res.ok) {
                throw new Error("Error fetching friends")
            }
            return await res.json()
        })
        .then((data) => {
       
            if (data.chats && Array.isArray(data.chats)) {
                setFriends(data.chats)
            } else {
                console.error("Unexpected data format:", data)
            }
        })
        .catch((err) => {
            if (err.name !== 'AbortError') {
                console.log(err)
            }
        })

        return () => controller.abort()
    }, [postId]) 

    const sendPostHandler = async (chatId: number) => {
 
        if(sentList.includes(chatId)) return;

        try {
            const res = await fetch(`${API_URL}/SendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ chatId, postId })
            })

            if (!res.ok) {
                throw new Error("Couldn't send message")
            }

       
            setSentList((prev) => [...prev, chatId])
            
        } catch (err) {
            console.log(err)
        }
    }

    return (
        <div className="SharePanel">
            <h3>Send to</h3>
            <div className="friendsList">
                {friends?.map((f) => {
                    const isSent = sentList.includes(f.chat_id);
                    
                    return (
                        <div 
                            className="friendRow" 
                            key={f.chat_id}
                            onClick={() => sendPostHandler(f.chat_id)}
                            style={{ 
                                cursor: isSent ? 'default' : 'pointer',
                                opacity: isSent ? 0.6 : 1 
                            }}
                        >
                            <img 
                                src={f.chat_image || "/default-avatar.png"} 
                                alt="chat" 
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}}
                            />
                            
                            <div className="FriendInfo" style={{ marginLeft: '10px' }}>
                                <div className="FriendName">
                                    {f.chat_name || "Unknown Chat"}
                                </div>
                                {isSent && <small style={{ color: 'green' }}>Sent!</small>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SharePostPanel