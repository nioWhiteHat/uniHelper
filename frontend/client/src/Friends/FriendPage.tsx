import { useEffect, useState } from "react";
import { API_URL } from "../config";
import "./FriendsPage.css";
import BurgerButton from "../FeedPage/BurgerButton";
import DashboardMenu from "../FeedPage/DashboardMenu";
import { useNavigate } from "react-router-dom";
import "../FeedPage/DashboardMenu.css";

export interface Account {
    id: number;
    name: string;
    last_name: string;
    semester: number;
    image: string | null;
}

interface Label {
    id: number;
    name: string;
    semester?: number;
}

const FriendsPage = () => {
    const nav = useNavigate();
    const [GroupChatName, SetGroupChatName] = useState<string>("");
    const [creatingGroupChat, SetCreatingGroupChat] = useState<boolean>(false);
    const [GroupChatMembers, SetGroupChatMembers] = useState<Account[]>([]);
    
    // --- NEW: State for Group Chat Image ---
    const [groupChatImage, setGroupChatImage] = useState<string | null>(null);
    // ---------------------------------------

    const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
    const [loadingReq, setLoadingReq] = useState<boolean>(false);
    const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);

    const [myFriends, setMyFriends] = useState<Account[]>([]);
    const [requestsReceived, setRequestsReceived] = useState<Account[]>([]);
    const [candidates, setCandidates] = useState<Account[]>([]);

    const [allInterests, setAllInterests] = useState<Label[]>([]);
    const [allLessons, setAllLessons] = useState<Label[]>([]);

    const [filters, setFilters] = useState({
        interests: [] as number[],
        lessons: [] as number[],
        semestermin: 1,
        semestermax: 3,
        searchText: ""
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetch(`${API_URL}/interests`)
            .then(res => res.json())
            .then(data => setAllInterests(data))
            .catch(err => console.error("Error fetching interests:", err));

        fetch(`${API_URL}/lessons`)
            .then(res => res.json())
            .then(data => setAllLessons(data))
            .catch(err => console.error("Error fetching lessons:", err));
    }, []);


    useEffect(() => {
        setLoadingFriends(true);
        fetch(`${API_URL}/GetFriends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setMyFriends(data))
            .catch(err => console.error(err))
            .finally(() => setLoadingFriends(false));
    }, [requestsReceived]);


    useEffect(() => {
        setLoadingReq(true);
        fetch(`${API_URL}/GetFriendRequests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setRequestsReceived(data))
            .catch(err => console.error(err))
            .finally(() => setLoadingReq(false));
    }, []);

    useEffect(() => {
        setLoadingCandidates(true);
        const timer = setTimeout(() => {
            fetch(`${API_URL}/FindPotentialFriends`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filters })
            })
                .then(res => res.json())
                .then(data => setCandidates(data))
                .catch(err => console.error(err))
                .finally(() => setLoadingCandidates(false));
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);


    const toggleFilterTag = (id: number, type: 'interest' | 'lesson') => {
        setFilters(prev => {
            const list = type === 'interest' ? prev.interests : prev.lessons;
            const newList = list.includes(id)
                ? list.filter(item => item !== id)
                : [...list, id];

            return {
                ...prev,
                [type === 'interest' ? 'interests' : 'lessons']: newList
            };
        });
    };

    const handleAcceptRequest = (id: number) => {
        setLoadingFriends(true);
        setLoadingReq(true);
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/AcceptFriendRequest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friendId: id })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to accept friend request");
                }
                setRequestsReceived(prev => prev.filter(req => req.id !== id));
                setMyFriends(prev => [...prev, requestsReceived.find(req => req.id === id)!]);
            })
            .catch(err => {
                console.error(err);
            })

    };

    const handleSendRequest = (id: number) => {
        fetch(`${API_URL}/SendFriendRequest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ id: id }),
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        });

    };
    const handleViewProfile = (id: number) => {
        nav(`/UserProfile/${id}`);
    };
    const navigate = useNavigate();

    const StartChat = (studentId: number) => {
        navigate(`/chat/${studentId}`);
    };

    const updateGroupChatMembers = (friend: Account) => {
        SetGroupChatMembers((prev) => {
            // Check if ID exists in the array
            const exists = prev.some((member) => member.id === friend.id);

            if (exists) {
                // Remove by ID
                return prev.filter((x) => x.id !== friend.id);
            } else {
                // Add
                return [...prev, friend];
            }
        });
    };

    // --- NEW: Handle Image Upload Logic ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGroupChatImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    // --------------------------------------

    const CreateGroupChat = () => {
        // Validation: Prevent creating empty chats
        if (!GroupChatName.trim()) {
            alert("Please enter a chat name");
            return;
        }
        if (GroupChatMembers.length === 0) {
            alert("Please select at least one friend");
            return;
        }

        const memberIds = GroupChatMembers.map((m) => { return m.id })
        const chatName = GroupChatName

        fetch(`${API_URL}/CreateChat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            // --- NEW: Added image to payload ---
            body: JSON.stringify({ 
                memberIds, 
                chatName, 
                image: groupChatImage 
            })
            // -----------------------------------
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("couldnt create chat")
                }
                alert("Group Chat Created Successfully!"); 
                SetCreatingGroupChat(false);             
                SetGroupChatName("");                    
                SetGroupChatMembers([]);
                // --- NEW: Reset Image State ---
                setGroupChatImage(null);
                // ------------------------------
            })
            .catch((err) => {
                console.log(err)
                alert("Error creating chat");
            })
    }
    
    return (
        <div className="TotalContainer">

            <div className="FriendsPageContainer">

                <div className="SidePanel">

                    <div className="PanelCard">
                        <div className="CardHeader">
                            <h3>Friend Requests</h3>
                            <span className="Badge">{requestsReceived.length}</span>
                        </div>
                        <div className="ScrollList">
                            {loadingReq ? <div className="StateMsg">Loading...</div> :
                                requestsReceived.length === 0 ? <div className="StateMsg">No requests</div> :
                                    requestsReceived.map(req => (
                                        <div key={req.id} className="UserRow" >
                                            <img src={req.image || "/default.png"} alt="" className="AvatarSmall" onClick={() => handleViewProfile(req.id)} />
                                            <div className="UserInfo">
                                                <span className="UserName">{req.name} {req.last_name}</span>
                                                <span className="UserMeta">Sem {req.semester}</span>
                                            </div>
                                            <div className="RowActions">
                                                <button className="BtnIcon Accept" onClick={() => handleAcceptRequest(req.id)}>✓</button>
                                                <button className="BtnIcon Decline">✕</button>
                                            </div>
                                        </div>
                                    ))}
                        </div>
                    </div>


                    <div className="PanelCard">
                        <div className="CardHeader">
                            <h3>My Friends</h3>
                            <span className="Badge Grey">{myFriends.length}</span>
                        </div>
                        <div className="ScrollList">
                            {loadingFriends ? <div className="StateMsg">Loading...</div> :
                                myFriends.length === 0 ? <div className="StateMsg">No friends yet</div> :
                                    myFriends.map(friend => (
                                        <div key={friend.id} className="UserRow" >
                                            <img src={friend.image || "/default.png"} alt="" className="AvatarSmall" onClick={() => handleViewProfile(friend.id)} />
                                            <div className="UserInfo">
                                                <span className="UserName">{friend.name} {friend.last_name}</span>
                                                <span className="UserMeta">Semester {friend.semester}</span>
                                            </div>
                                            {creatingGroupChat ? (<><button className="AddToGroupChatButton" onClick={() => { updateGroupChatMembers(friend) }}>{GroupChatMembers.some(m => m.id === friend.id) ? ("-") : ("+")}</button></>) : (<button className="BtnIcon Message" onClick={() => { StartChat(friend.id) }}>💬</button>)}


                                        </div>
                                    ))}
                        </div>
                        {!creatingGroupChat ? (<button className="StartGroupChat" onClick={() => { SetCreatingGroupChat(true) }}>start a groupchat</button>) : (
                            <div className="GroupChatCreationInfo">
                                <input
                                    className="GroupChatNameText"
                                    placeholder="Enter Chat Name"
                                    value={GroupChatName}
                                    onChange={(e) => SetGroupChatName(e.target.value)}
                                />
                                
                                {/* --- NEW: Image Upload Input & Preview --- */}
                                <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                                    <label htmlFor="groupChatImg" style={{fontSize:'12px', cursor:'pointer', color:'#0084ff'}}>
                                        {groupChatImage ? "Change Image" : "Add Group Image"}
                                    </label>
                                    <input 
                                        id="groupChatImg"
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{display: 'none'}} // Hiding default ugly input
                                    />
                                    {groupChatImage && (
                                        <img src={groupChatImage} alt="Preview" className="AvatarSmall" style={{width:'30px', height:'30px'}}/>
                                    )}
                                </div>
                                {/* ---------------------------------------- */}

                                <button className="StartGroupChat" onClick={() => { CreateGroupChat() }}>start group chat</button>
                            </div>
                        )}
                    </div>
                </div>


                <div className="MainSearchArea">
                    <div className="SearchSection">
                        <h2>Find New Friends</h2>

                        <input
                            className="SearchInput"
                            placeholder="Search by name..."
                            value={filters.searchText}
                            onChange={e => setFilters({ ...filters, searchText: e.target.value })}
                        />

                        <div className="FilterRow">
                            <label>Semester Range:</label>
                            <input
                                type="number" className="NumInput" min="1" max="12"
                                value={filters.semestermin}
                                onChange={e => setFilters({ ...filters, semestermin: parseInt(e.target.value) })}
                            />
                            <span>to</span>
                            <input
                                type="number" className="NumInput" min="1" max="12"
                                value={filters.semestermax}
                                onChange={e => setFilters({ ...filters, semestermax: parseInt(e.target.value) })}
                            />
                        </div>

                        <div className="TagFiltersContainer">

                            <div className="TagWindow">
                                <h4>Filter by Interests</h4>
                                <div className="TagGrid">
                                    {allInterests.map(tag => (
                                        <button
                                            key={tag.id}
                                            className={`FilterChip Interest ${filters.interests.includes(tag.id) ? 'active' : ''}`}
                                            onClick={() => toggleFilterTag(tag.id, 'interest')}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            <div className="TagWindow">
                                <h4>Filter by Lessons</h4>
                                <div className="TagGrid">
                                    {allLessons.map(tag => (
                                        <button
                                            key={tag.id}
                                            className={`FilterChip Lesson ${filters.lessons.includes(tag.id) ? 'active' : ''}`}
                                            onClick={() => toggleFilterTag(tag.id, 'lesson')}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ResultsGrid">
                        {loadingCandidates ? <div className="StateMsg Full">Searching...</div> :
                            candidates.length === 0 ? <div className="StateMsg Full">No matching students found.</div> :
                                candidates.map(c => (
                                    <div key={c.id} className="CandidateCard" >
                                        <img src={c.image || "/default.png"} alt="" className="AvatarLarge" onClick={() => handleViewProfile(c.id)} />
                                        <div className="CandidateInfo">
                                            <h4>{c.name} {c.last_name}</h4>
                                            <span className="CandidateSem">Semester {c.semester}</span>
                                            <button className="BtnAdd" onClick={() => handleSendRequest(c.id)}>Add Friend +</button>
                                        </div>
                                    </div>
                                ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendsPage;