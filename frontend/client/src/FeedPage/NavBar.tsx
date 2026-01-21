import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavBar.css';

// --- Interfaces ---
interface SearchResult {
    id: number;
    title: string;
    interactions: number;
}

// --- Sub-Component: Burger Button ---

interface NavBarProps {
    SearchText: string;
    SetSearchText: (text: string) => void;
    SetPostId: (id: number | null) => void;
    InterestLabels: number[];
    LessonLabels: number[];
}
const NavBar = ({ SearchText, SetSearchText, SetPostId, InterestLabels, LessonLabels }: NavBarProps) => {
    const navigate = useNavigate();
    const [searchText, setSearchText] = useState<string>("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const searchRef = useRef<HTMLDivElement>(null);

    // 1. Debounce Logic: Wait 500ms after user stops typing before fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText.length > 0) {
                fetchDropdownResults();
            } else {
                setResults([]); // Clear results if text is empty
            }
        }, 500);

        return () => clearTimeout(timer); // Cleanup timer on every keystroke
    }, [searchText]);

    // 2. Fetch Logic
    const fetchDropdownResults = async () => {
        const token = localStorage.getItem('token');
        try {
            let GeneralFeed = false;
            if (LessonLabels.length === 0 && InterestLabels.length === 0) {
                GeneralFeed = true;
            }
            // NOTE: Using POST because your controller uses req.body
            const response = await fetch('http://localhost:3000/api/GetPostDropDown', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    SearchText: searchText,
                    GeneralFeed: GeneralFeed,
                    InterestLabels: InterestLabels,
                    LessonLabels: LessonLabels,
                    // You can add InterestLabels/LessonLabels here if you have them in context
                })
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data);
                setShowDropdown(true);
            }
        } catch (error) {
            console.error("Search error:", error);
        }
    };

    // 3. Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleResultClick = (postId: number | null) => {
        SetPostId(postId);
        SetSearchText(searchText);
        setShowDropdown(false);
        setSearchText(""); // Optional: Clear search after click
    };

    return (
        <div className="navbar-container">
            {/* Left: Logo */}
            <div className="navbar-left" onClick={() => navigate('/FeedPage')}>
                <img src="/your-logo.png" alt="Home" className="navbar-logo" />
            </div>

            {/* Center: Search Bar */}
            <div className="navbar-center" ref={searchRef}>
                <div className="search-wrapper">
                    <span className="search-icon" onClick={()=>handleResultClick(null)}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search posts..." 
                        className="navbar-input"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onFocus={() => searchText && setShowDropdown(true)}
                    />
                    
                    {/* Dropdown Results */}
                    {showDropdown && results.length > 0 && (
                        <div className="search-dropdown">
                            {results.map((post) => (
                                <div 
                                    key={post.id} 
                                    className="search-item"
                                    onClick={() => handleResultClick(post.id)}
                                >
                                    <span className="search-item-title">{post.title}</span>
                                    {/* Optional: Show interactions count */}
                                    <span className="search-item-meta">⭐ {post.interactions}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            
        </div>
    );
};

export default NavBar;