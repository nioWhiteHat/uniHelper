import { useState } from "react";
import type { Post } from "./Feed";
import { API_URL } from "../config";
import "./Post.css";
// 1. Import the component we created in the previous step
import SharePostPanel from "./SharePostPanel"; 

export default function Post({ student, id, title, description, image, date, interests_labels, lessons_labels, total_likes, total_dislikes, lastComment }: Post) {
    const [likes, SetLikes] = useState<number>(total_likes);
    const [dislikes, SetDislikes] = useState<number>(total_dislikes);
    const [showSharePanel, setShowSharePanel] = useState<boolean>(false);

    const token = localStorage.getItem('token');

    const HandleRating = (rating: string) => {
        // ... (Your existing rating logic remains exactly the same)
        if (rating === "like") {
            SetLikes(prev => prev + 1);
        } else {
            SetDislikes(prev => prev + 1);
        }
        let like = 0;
        let dislike = 0;
        if (rating === "like") {
            like = 1;
        } else {
            dislike = 1;
        }
        fetch(`${API_URL}/LikeDislikePost`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ like: like, dislike: dislike, postId: id })
        })
        .catch(error => console.log(error));
    };

    return (
        <div className="Post" style={{ position: 'relative' }}> 
            <div className="PostTitle">
                <div className="StudentPosted" >
                    <img src={student.image} alt="student profile" className="StudentProfileImg" />
                    <div className="StudentName">{student.name}</div>
                </div>
                {title}
            </div>
            <div className="PostImage" >
                <img src={image} alt="post content" className="PostImg" />
            </div>
            <div className="PostDescription">
                {description}
            </div>
            
            <div className="PostRatings">
                <div className="PostLikeDislike">
                    <div className="LikeImg" onClick={() => { HandleRating("like") }}></div>
                    {likes}   
                    <div className="DislikeImg" onClick={() => { HandleRating("dislike") }}></div>
                    {dislikes}
                </div>

                {/* Toggle Button */}
                <button 
                    className="ShareButton" 
                    onClick={() => setShowSharePanel(!showSharePanel)}
                >
                    🚀 Send
                </button>
            </div>

            {/* --- NEW: Share Logic Integrated Here --- */}
            {showSharePanel && (
                <div className="SharePanelPopup">
                    <div className="SharePopupHeader">
                        <span>Send to...</span>
                        <button 
                            className="CloseShareBtn" 
                            onClick={() => setShowSharePanel(false)}
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* 2. Pass the Post ID to the child component */}
                    <div className="ShareComponentWrapper">
                        <SharePostPanel postId={id} />
                    </div>
                </div>
            )}
            {/* -------------------------------------- */}

            <div className="PostLastComment">{lastComment?.text} {lastComment?.date}</div>
            <div className="PostLessonLabels">
                {lessons_labels.map((p, index) => (
                    <div className="PostLabel" key={index}>{p}</div>
                ))}
            </div>
            <div className="PostInterestLabels">
                {interests_labels.map((i, index) => (
                    <div className="PostLabel" key={index}>{i}</div>
                ))}
            </div>
            <div className="PostDate">{date}</div>
        </div>
    );
}