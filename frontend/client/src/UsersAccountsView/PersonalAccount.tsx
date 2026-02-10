import { useState, useEffect } from "react";
import { API_URL } from "../config";
import Post from "../FeedPage/Post";
import "./PersonalAccount.css";

interface UserDetails {
    id: number;
    name: string;
    last_name: string;
    email: string;
    semester: number;
    image: string;
    friend_count: number;
    bio?: string;
}

interface Label {
    id: number;
    name: string;
    semester?: number;
}

interface PostData {
    student: { id: number; name: string; image: string };
    id: number;
    title: string;
    description: string;
    image: string;
    date: string;
    interests_labels: string[];
    lessons_labels: string[];
    total_likes: number;
    total_dislikes: number;
    lastComment: any;
}

export default function PersonalAccount() {
    const [user, setUser] = useState<UserDetails | null>(null);
    const [userPosts, setUserPosts] = useState<PostData[]>([]);
    const [loading, setLoading] = useState(true);

    const [allInterests, setAllInterests] = useState<Label[]>([]);
    const [allLessons, setAllLessons] = useState<Label[]>([]);

    const [myInterestIds, setMyInterestIds] = useState<number[]>([]);
    const [myLessonIds, setMyLessonIds] = useState<number[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'interests' | 'lessons' | null>(null);
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

    const [newPostTitle, setNewPostTitle] = useState("");
    const [newPostDesc, setNewPostDesc] = useState("");
    const [newPostImage, setNewPostImage] = useState<string>("");
    const [newPostVisibility, setNewPostVisibility] = useState<"public" | "private">("public");
    const [newPostInterestIds, setNewPostInterestIds] = useState<number[]>([]);
    const [newPostLessonIds, setNewPostLessonIds] = useState<number[]>([]);
    const [showPostTagOptions, setShowPostTagOptions] = useState(false);
    
    const fetchProfileData = () => {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/ViewPersonalProfile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            setUser(data.details);
            setUserPosts(data.posts);
            setMyInterestIds(data.interests.map((i: Label) => i.id));
            setMyLessonIds(data.lessons.map((l: Label) => l.id));
            setLoading(false);
        })
        .catch(err => console.error(err));
    };

    const fetchAllTags = () => {
        fetch(`${API_URL}/interests`).then(res => res.json()).then(setAllInterests);
        fetch(`${API_URL}/lessons`).then(res => res.json()).then(setAllLessons);
    };

    useEffect(() => {
        fetchProfileData();
        fetchAllTags();
    }, []);

    const convertToBase64 = (file: File, callback: (result: string) => void) => {
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            convertToBase64(file, (base64) => {
                setUser({ ...user, image: base64 });
                
                const token = localStorage.getItem('token');
                fetch(`${API_URL}/UpdateProfileImage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ image: base64 })
                })
                .then(res => {
                    if (!res.ok) console.error("Failed to update profile image");
                })
                .catch(err => console.error(err));
            });
        }
    };

    const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            convertToBase64(file, (base64) => setNewPostImage(base64));
        }
    };

    const openModal = (type: 'interests' | 'lessons') => {
        setModalType(type);
        setTempSelectedIds(type === 'interests' ? myInterestIds : myLessonIds);
        setIsModalOpen(true);
    };

    const toggleModalSelection = (id: number) => {
        if (tempSelectedIds.includes(id)) {
            setTempSelectedIds(tempSelectedIds.filter(tid => tid !== id));
        } else {
            setTempSelectedIds([...tempSelectedIds, id]);
        }
    };

    const saveModalChanges = () => {
        const token = localStorage.getItem('token');
        const payload = {
            interestIds: modalType === 'interests' ? tempSelectedIds : myInterestIds,
            lessonIds: modalType === 'lessons' ? tempSelectedIds : myLessonIds
        };

        fetch(`${API_URL}/UpdateProfileTags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (res.ok) {
                if (modalType === 'interests') setMyInterestIds(tempSelectedIds);
                else setMyLessonIds(tempSelectedIds);
                setIsModalOpen(false);
            }
        });
    };

    const handleCreatePost = () => {
        if (!newPostTitle || !newPostDesc) return alert("Title and Description are required");

        const token = localStorage.getItem('token');
        const payload = {
            title: newPostTitle,
            description: newPostDesc,
            image: newPostImage || "",
            visibility: newPostVisibility,
            interests: newPostInterestIds,
            lessons: newPostLessonIds
        };

        fetch(`${API_URL}/CreatePost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async res => {
            if (res.ok) {
                setNewPostTitle("");
                setNewPostDesc("");
                setNewPostImage("");
                setNewPostInterestIds([]);
                setNewPostLessonIds([]);
                setShowPostTagOptions(false);
                fetchProfileData(); 
            } else {
                alert("Failed to create post");
            }
        })
        .catch(err => console.error(err));
    };

    const togglePostTag = (id: number, type: 'interest' | 'lesson') => {
        if (type === 'interest') {
            newPostInterestIds.includes(id) 
                ? setNewPostInterestIds(newPostInterestIds.filter(x => x !== id))
                : setNewPostInterestIds([...newPostInterestIds, id]);
        } else {
            newPostLessonIds.includes(id)
                ? setNewPostLessonIds(newPostLessonIds.filter(x => x !== id))
                : setNewPostLessonIds([...newPostLessonIds, id]);
        }
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    return (
        <div className="AccountContainer">
            {isModalOpen && (
                <div className="ModalOverlay" onClick={() => setIsModalOpen(false)}>
                    <div className="ModalContent" onClick={e => e.stopPropagation()}>
                        <h3>Edit {modalType === 'interests' ? "Interests" : "Lessons"}</h3>
                        <div className="ModalGrid">
                            {(modalType === 'interests' ? allInterests : allLessons).map(item => (
                                <button
                                    key={item.id}
                                    className={`ModalTag ${tempSelectedIds.includes(item.id) ? 'selected' : ''}`}
                                    onClick={() => toggleModalSelection(item.id)}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <div className="ModalActions">
                            <button className="CancelBtn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="SaveModalBtn" onClick={saveModalChanges}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ProfileCard">
                <div className="ProfileHeader">
                    <div className="ProfileImageContainer">
                        <img src={user?.image} alt="Profile" className="ProfileAvatar" />
                        <label className="EditImageOverlay">
                            📷
                            <input type="file" hidden accept="image/*" onChange={handleProfileImageChange} />
                        </label>
                    </div>
                    <div className="ProfileInfo">
                        <h1>{user?.name} {user?.last_name}</h1>
                        <div className="ProfileDetailsBox">
                            <div className="DetailItem">
                                <span className="DetailLabel">Email</span>
                                <span className="DetailValue">{user?.email}</span>
                            </div>
                            <div className="DetailItem">
                                <span className="DetailLabel">Friends</span>
                                <span className="DetailValue highlight">{user?.friend_count}</span>
                            </div>
                            <div className="DetailItem">
                                <span className="DetailLabel">Semester</span>
                                <span className="DetailValue">{user?.semester}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ProfileTags">
                    <div className="TagGroup InterestGroup">
                        <div className="TagGroupHeader">
                            <h3>Interests</h3>
                            <button className="EditTagsBtn" onClick={() => openModal('interests')}>✎ Edit</button>
                        </div>
                        <div className="TagList">
                            {allInterests.filter(i => myInterestIds.includes(i.id)).map(i => (
                                <span key={i.id} className="TagChip Interest">{i.name}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="TagGroup LessonGroup">
                        <div className="TagGroupHeader">
                            <h3>Lessons</h3>
                            <button className="EditTagsBtn" onClick={() => openModal('lessons')}>✎ Edit</button>
                        </div>
                        <div className="TagList">
                            {allLessons.filter(l => myLessonIds.includes(l.id)).map(l => (
                                <span key={l.id} className="TagChip Lesson">{l.name}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="CreatePostContainer">
                <h3>Create New Post</h3>
                
                <input 
                    className="NewPostInput" 
                    placeholder="Title" 
                    value={newPostTitle} 
                    onChange={e => setNewPostTitle(e.target.value)} 
                />
                
                <textarea 
                    className="NewPostTextarea" 
                    placeholder="What's on your mind?"
                    value={newPostDesc}
                    onChange={e => setNewPostDesc(e.target.value)} 
                />

                <div className="PostImageUpload">
                    {newPostImage ? (
                        <div className="ImagePreviewContainer">
                            <img src={newPostImage} alt="Preview" className="PostImagePreview" />
                            <div className="RemoveImage" onClick={() => setNewPostImage("")}>✖</div>
                        </div>
                    ) : (
                        <label className="UploadPlaceholder">
                            <span>🖼️ Add an Image</span>
                            <input type="file" hidden accept="image/*" onChange={handlePostImageChange} />
                        </label>
                    )}
                </div>

                <div className="PostSettings">
                    <div className="SettingRow">
                        <label>Visibility:</label>
                        <select 
                            value={newPostVisibility} 
                            onChange={(e) => setNewPostVisibility(e.target.value as "public" | "private")}
                            className="VisibilitySelect"
                        >
                            <option value="public">🌍 Public</option>
                            <option value="private">🔒 Private (Friends Only)</option>
                        </select>
                    </div>

                    <div className="SettingRow">
                        <button 
                            className={`ToggleTagsBtn ${showPostTagOptions ? 'active' : ''}`}
                            onClick={() => setShowPostTagOptions(!showPostTagOptions)}
                        >
                            🏷️ {showPostTagOptions ? "Hide Tags" : "Add Tags to Post"}
                        </button>
                    </div>
                </div>

                {showPostTagOptions && (
                    <div className="PostTagSelector">
                        <div className="SelectorColumn">
                            <h4>Select Interests</h4>
                            <div className="SelectorGrid">
                                {allInterests.map(i => (
                                    <div 
                                        key={i.id} 
                                        className={`SelectorChip ${newPostInterestIds.includes(i.id) ? 'active' : ''}`}
                                        onClick={() => togglePostTag(i.id, 'interest')}
                                    >
                                        {i.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="SelectorColumn">
                            <h4>Select Lessons</h4>
                            <div className="SelectorGrid">
                                {allLessons.map(l => (
                                    <div 
                                        key={l.id} 
                                        className={`SelectorChip ${newPostLessonIds.includes(l.id) ? 'active' : ''}`}
                                        onClick={() => togglePostTag(l.id, 'lesson')}
                                    >
                                        {l.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="CreatePostActions">
                    <button className="PostBtn" onClick={handleCreatePost}>Post</button>
                </div>
            </div>

            <div className="UserPostsList">
                <h3>My Posts</h3>
                {userPosts.length > 0 ? (
                    userPosts.map(p => <Post key={p.id} {...p} />)
                ) : (
                    <div className="NoPosts">No posts yet.</div>
                )}
            </div>
        </div>
    );
}