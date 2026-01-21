import { useState } from "react";
import Feed from "./Feed";
import NavBar from "./NavBar";
import './FeedLayout.css';

import FilterLabels from "./FilterLabels";
import BurgerButton from "./BurgerButton";
import DashboardMenu from "./DashboardMenu";
interface SharedProps{
    InterestLabels:Array<number>,
    LessonLabels:Array<number>,
    SearchText:string,
    postId:number|null
    
}

export default function FeedPage(){
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const SetMenuIsOpen = (isOpen:boolean)=>{
        setMenuIsOpen(isOpen);
    }
    const [sharedProps, setSharedProps] = useState<SharedProps>({
        InterestLabels: [],
        LessonLabels: [],
        SearchText: "",
        postId: null
        
    });
    
    const SetSearchText = (text:string)=>{
        setSharedProps(prev => ({
            ...prev,
            SearchText: text
        }));
    };

    // FIX 2: Use 'prev' here
    const SetInterestLabels = (labels:Array<number>)=>{
        setSharedProps(prev => ({
            ...prev,
            InterestLabels: labels
        }));
    };

    // FIX 3: Use 'prev' here
    const SetLessonLabels = (labels:Array<number>)=>{
        setSharedProps(prev => ({
            ...prev,
            LessonLabels: labels
        }));
    };

    // FIX 4: Use 'prev' here
    const SetPostId = (id:number|null)=>{
        setSharedProps(prev => ({
            ...prev,
            postId: id
        }));
    }
    return(
        <div className="FeedPageContainer">
            {menuIsOpen && 
            <div className="DashboardMenuContainer">
                <DashboardMenu MenuIsOpen={menuIsOpen} SetMenuIsOpen={SetMenuIsOpen}/>
            </div>}
            <div className="FeedLayout">
                <div className="GeneralPanel">
                    <BurgerButton MenuIsOpen={menuIsOpen} SetMenuIsOpen={SetMenuIsOpen} />
                    <NavBar SearchText={sharedProps.SearchText} SetSearchText={SetSearchText} SetPostId={SetPostId} InterestLabels={sharedProps.InterestLabels} LessonLabels={sharedProps.LessonLabels} />
                </div>
                
                <div className="FeedAndFiltersContainer">
                    <Feed InterestLabels={sharedProps.InterestLabels} LessonLabels={sharedProps.LessonLabels} SearchText={sharedProps.SearchText} postId={sharedProps.postId}/>
                    <FilterLabels InterestLabels={sharedProps.InterestLabels} LessonLabels={sharedProps.LessonLabels} SetInterestLabels={SetInterestLabels} SetLessonLabels={SetLessonLabels}/>
                </div>
            </div>
        </div>
        
    );
}