import { use, useEffect, useState } from "react";
import { API_URL } from "../config";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../FeedPage/Post";
import "./ViewStudentAccount.css";

interface StudentsPosts {
  post_id: number;
  title: string;
  description: string;
  image: string;
  date: string;
  interests_labels: string[];
  lesson_labels: string[];
  total_likes: number;
  total_dislikes: number;
}
interface Response{
    profileData:StudentProfileFromDB,
    chatId:number|null
}

interface StudentProfileFromDB {
  id: number;
  name: string;
  last_name: string;
  email?: string;
  semester: number;
  image: string;
  bio: string;
  interests: string[];
  lessons: string[];
  
  posts: StudentsPosts[];
  relationshipStatus: string;
  NumberOfFriends: number;
}



const ViewStudentAccount = () => {
    const token = localStorage.getItem("token");
    const studentId = useParams().id;
    const [PersonalInfo, setPersonalInfo] = useState<StudentProfileFromDB>();
    const [loading, setLoading] = useState<boolean>(true);
    const [friendReqSent, setFriendReqSent] = useState<boolean>(false);
    const [chatId, setChatId] = useState<number|null>(null)
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/ViewProfile/${studentId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            })
            .then((data: Response) => {
                setPersonalInfo(data.profileData);
                setChatId(data.chatId);
                if (data.profileData.relationshipStatus === 'request_sent') {
                    setFriendReqSent(true);
                }
            })
            .catch((error) => {
                console.error("Error fetching student info:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [studentId, token]);

    const SendFriendRequest = async () => {
        fetch(`${API_URL}/SendFriendRequest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ id: studentId }),
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setFriendReqSent(true);
        });
    };

    const RejectFriendRequest = async () => {
        fetch(`${API_URL}/RejectFriendRequest`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: studentId })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
           
                if(PersonalInfo) setPersonalInfo({...PersonalInfo, relationshipStatus: 'none'});
            })
            .catch(error => {
                console.error("Error rejecting friend request:", error)
            }
            );
    };
    
    const AcceptFriendRequest = async () => {
        fetch(`${API_URL}/AcceptFriendRequest`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id: studentId })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                if(PersonalInfo) setPersonalInfo({...PersonalInfo, relationshipStatus: 'friends'});
            })
            .catch(error => {
                console.error("Error accepting friend request:", error)
            }
            );
    };
    
    const OpenChat = async (chatId:number|null)=>{
        if(chatId===null){
            fetch(`${API_URL}/CreateChat`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ memberIds:[PersonalInfo?.id] })
            })
            .then(async (response)=>{
                if (!response.ok){
                    throw new Error("couldnt fetch chatId")
                }
                return await response.json()
            })
            .then((data)=>{
                console.log(data);
                if(!data.chat.id){
                    throw new Error("couldnt fetch chatId")
                }
                navigate(`/Chat/${data.chat.id}`)
            })
            .catch(err=>{
                console.log(err)
            })
        }else{
            navigate(`/Chat/${chatId}`)
        }
    }
   
    const renderActionButtons = () => {
        if (!PersonalInfo) return null;

        if (PersonalInfo.relationshipStatus === 'friends') {
            return (
                <button className="action-btn message-btn" onClick={()=>{OpenChat(chatId)}}>
                    Send Message
                </button>
            );
        }

        
        if (PersonalInfo.relationshipStatus === 'request_received') {
            return (
                <div className="button-group">
                    <button className="action-btn accept-btn" onClick={AcceptFriendRequest}>
                        Accept Request
                    </button>
                    <button className="action-btn reject-btn" onClick={RejectFriendRequest}>
                        Reject
                    </button>
                </div>
            );
        }

        
        if (PersonalInfo.relationshipStatus === 'request_sent' || friendReqSent) {
            return (
                <button className="action-btn disabled-btn" disabled>
                    Request Sent
                </button>
            );
        }

        return (
            <button className="action-btn add-friend-btn" onClick={SendFriendRequest}>
                Send Friend Request
            </button>
        );
    };

    return (
        <div className="view-student-container">
            {loading ? (
                <div className="loading-spinner">Loading Profile...</div>
            ) : PersonalInfo ? (
                <>
                 
                    <div className="profile-header-card">
                        <div className="profile-top-row">
                            <div className="profile-image-container">
                                <img 
                                    src={PersonalInfo.image} 
                                    alt={`${PersonalInfo.name} ${PersonalInfo.last_name}`} 
                                    className="profile-main-img" 
                                />
                            </div>
                            <div className="profile-info-content">
                                <h1 className="profile-name">
                                    {PersonalInfo.name} {PersonalInfo.last_name}
                                </h1>
                                <p className="profile-detail">
                                    <span className="label">Email:</span> {PersonalInfo.email}
                                </p>
                                <p className="profile-detail">
                                    <span className="label">Semester:</span> {PersonalInfo.semester}
                                </p>
                                <p className="profile-detail">
                                    <span className="label">Friends:</span> {PersonalInfo.NumberOfFriends}
                                </p>
                                <div className="profile-bio">
                                    <p>{PersonalInfo.bio}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="profile-actions-row">
                            {renderActionButtons()}
                        </div>
                    </div>

                    <div className="profile-divider">
                        <h2>Posts</h2>
                    </div>

                    {/* Bottom Section: Posts Map */}
                    <div className="student-posts-list">
                        {PersonalInfo.posts && PersonalInfo.posts.length > 0 ? (
                            PersonalInfo.posts.map((post) => {
                                // Create a student object for the Post component props
                                const postStudent = {
                                    id: PersonalInfo.id,
                                    name: `${PersonalInfo.name} ${PersonalInfo.last_name}`,
                                    image: PersonalInfo.image,
                                    
                                };
                             
                                return (
                                    <Post
                                        key={post.post_id}
                                        id={post.post_id}
                                        student={postStudent}
                                        title={post.title}
                                        description={post.description}
                                        image={post.image}
                                        date={post.date}
                                        interests_labels={post.interests_labels}
                                        lessons_labels={post.lesson_labels} 
                                        total_likes={post.total_likes}
                                        total_dislikes={post.total_dislikes}
                                        
                                    />
                                );
                            })
                        ) : (
                            <div className="no-posts-message">
                                <p>No posts to show.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="error-message">Student profile not found.</div>
            )}
        </div>
    );
};

export default ViewStudentAccount;
