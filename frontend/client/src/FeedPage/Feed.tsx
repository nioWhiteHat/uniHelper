import { useEffect, useState } from "react";
import { API_URL } from "../config";
import Post from "./Post";
import "./FeedLayout.css";
export interface Post{
    student:Student,
    id:number,
    title:string,
    description:String,
    image:string,
    date:string,
    interests_labels:Array<string>,
    lessons_labels:Array<string>,
    total_likes:number,
    total_dislikes:number,
    lastComment:Comment|null
}
interface FeedResponse{
    posts:Array<Post>,
    
}
interface Comment{
    student:Student,
    id:number,
    text:string,
    date:String
}
interface Student{
    id:number,
    image:string,
    name:string
}
interface FeedProps{
    InterestLabels:Array<number>,
    LessonLabels:Array<number>,
    SearchText:string,
    postId:number|null
    
}

const Feed = ({InterestLabels,LessonLabels,SearchText,postId}:FeedProps) => {
    const token = localStorage.getItem('token');
    let GeneralFeed = false;
    if (InterestLabels.length === 0 && LessonLabels.length === 0 ){
        GeneralFeed = true;
    }
    
    const [feedData, setFeedData] = useState<FeedResponse>({ posts: [] });
    const [loading, setLoading] = useState<boolean>(true);
    const [Scroller,SetScroller] = useState<number>(0);

   
    useEffect(() => {
        setLoading(true);

        fetch(`${API_URL}/GetFeed`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({scroller: Scroller, GeneralFeed: GeneralFeed, InterestLabels: InterestLabels, LessonLabels: LessonLabels, SearchText: SearchText, postId: postId })
        })
        .then(response => response.json())
        .then((newPosts: Post[]) => {
            setFeedData(prev => ({
           
                posts: Scroller === 0 ? newPosts : [...prev.posts, ...newPosts]
            }));
            setLoading(false);
        })
        .catch(error => {
            console.error("Error fetching feed data:", error);
            setLoading(false);
        });

    }, [Scroller,SearchText,InterestLabels,LessonLabels,postId]); 

   
    useEffect(() => {
        const handleScroll = () => {
            const { scrollTop, clientHeight, scrollHeight } = document.documentElement;

           
            if (scrollTop + clientHeight >= scrollHeight - 20 && !loading) {
                SetScroller(prev => prev + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading]); 

    return (
        <div>
            <div className="FeedPostsContainer">
                {feedData.posts.map((p) => (
                  
                    <Post key={p.id} {...p}/>
                ))}
            </div>
            
            {loading && <div style={{textAlign: 'center', padding: '20px'}}>Loading more...</div>}
        </div>
    );
}
export default Feed;