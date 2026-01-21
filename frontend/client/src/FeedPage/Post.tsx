
import { useState } from "react";
import type { Post } from "./Feed";
import { API_URL } from "../config";
import { data } from "react-router-dom";
import "./Post.css";

export default function Post({student, id, title, description, image, date,interests_labels,lessons_labels,total_likes,total_dislikes,lastComment}:Post){
    const [likes,SetLikes] = useState<number>(total_likes) 
    const [dislikes,SetDislikes] = useState<number>(total_dislikes)
    const token = localStorage.getItem('token')
    const HandleRating = (rating:string)=>{
        if (rating === "like"){
            SetLikes(likes+1)
        }else{
            SetDislikes(dislikes+1)
        }
        fetch(`${API_URL}/LikeDislikePost`, {
                    method: 'post',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({like: likes, dislike: dislikes, postId: id})

        })
        .then(async response => {
            if (!response.ok){
                throw new Error('there was an error')
            }
            return await response.json()})
        
        .then(data=>{
            console.log(data)
        })
        .catch(error=>{
            console.log(error)
        });
        
        

    }
    return(
        <div className="Post" >
            <div className="PostTitle">
                <div className="StudentPosted" >
                    <img src={student.image} alt="student profile" className="StudentProfileImg"/>
                    <div className="StudentName">{student.name}</div>

                </div>

                {title}
            </div>
            <div className="PostImage" >
                <img src={image} alt="this is the supposed post image" className="PostImg" />
            </div>
            <div className="PostDescription">
                {description}
            </div>
            <div className="PostRatings">
                <div className="PostLikeDislike"><div className="LikeImg" onClick={()=>{HandleRating("like")}}></div>{total_likes}   <div className="DislikeImg">{total_dislikes}</div></div>
            </div>
            <div className="PostLastComment">{lastComment?.text} {lastComment?.date}</div>
            <div className="PostLessonLabels">
                {lessons_labels.map((p,index)=>(
                    <div className="PostLabel" key={index}>
                        {p}
                    </div>
                ))}
            </div>
            <div className="PostInterestLabels">
                {interests_labels.map((i, index)=>(
                    <div className="PostLabel" key={index}>
                        {i}
                    </div>
                ))}
            </div>
            <div className="PostDate">{date}</div>

        </div>
        
    )
}