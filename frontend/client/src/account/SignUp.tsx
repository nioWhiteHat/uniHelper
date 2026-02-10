import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { GoogleLogin } from '@react-oauth/google';
import "./SignUp.css";

// Define types for our data
interface Interest {
    id: number;
    name: string;
}

interface Lesson {
    id: number;
    name: string;
    semester: number;
}

const SignUp = () => {
    const navigate = useNavigate();

    // --- 1. Form Data State ---
    const [formData, setFormData] = useState({
        name: "",
        lastname: "",
        email: "",
        semester: "",
        password: ""
    });

    // --- 2. Checkbox Data State ---
    const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
    const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
    
    const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
    const [selectedLessons, setSelectedLessons] = useState<number[]>([]);

    const [errors, setErrors] = useState<any>({});
    const handleGoogleSuccess = async (credentialResponse: any) => {
    // Exact same function as in SignIn.tsx
    // It calls /GoogleSignIn which handles registration automatically
        try {
            const res = await fetch(`${API_URL}/GoogleSignIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                navigate('/FeedPage');
            }
        } catch (err) { console.error(err); }
    };
    // --- 3. Fetch Options on Load ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const interestsRes = await fetch(`${API_URL}/interests`);
                const lessonsRes = await fetch(`${API_URL}/lessons`);
                
                if (interestsRes.ok) setAvailableInterests(await interestsRes.json());
                if (lessonsRes.ok) setAvailableLessons(await lessonsRes.json());
            } catch (error) {
                console.error("Failed to load options", error);
            }
        };
        fetchData();
    }, []);

 
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        setFormData({ ...formData, [field]: e.target.value });
        setErrors({ ...errors, [field]: "", general: "" });
    };

    const toggleSelection = (id: number, currentList: number[], setList: Function) => {
        if (currentList.includes(id)) {
            setList(currentList.filter(item => item !== id));
        } else {
            setList([...currentList, id]);
        }
    };

    // --- 5. Submit Logic ---
    const handleSubmit = async () => {
        let isValid = true;
        const newErrors = { ...errors, general: "" };

        // Validation
        if (!formData.name.trim()) { newErrors.name = "First Name is required"; isValid = false; }
        if (!formData.lastname.trim()) { newErrors.lastname = "Last Name is required"; isValid = false; }
        if (!formData.semester) { newErrors.semester = "Semester is required"; isValid = false; }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) { newErrors.email = "Valid email is required"; isValid = false; }

        if (formData.password.length < 6) { 
            newErrors.password = "Password must be at least 6 chars"; 
            isValid = false; 
        }

        if (!isValid) {
            setErrors(newErrors);
            return;
        }

        // Prepare Payload
        const payload = {
            ...formData,
            interests: selectedInterests,
            lessons: selectedLessons
        };

        // API Call
        try {
            const response = await fetch(`${API_URL}/SignUp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            console.log("Sign Up Successful!");
            navigate("/signin");

        } catch (error: any) {
            console.error("Sign Up Error:", error.message);
            setErrors({ ...errors, general: error.message });
        }
    };

    // Group lessons by semester
    const lessonsBySemester = availableLessons.reduce((acc: any, lesson) => {
        const sem = lesson.semester;
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(lesson);
        return acc;
    }, {});

    return (
        <div className="SignUpContainer">
            <div className="SignUpContentWrapper">
                <h2>Create an Account</h2>
                {errors.general && <div className="GlobalError">{errors.general}</div>}

                <div className="SignUpCredentialsCard">
                    
                    {/* First Name */}
                    <div className="InputGroup">
                        <label className="InputLabel">First Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Antonis" 
                            className={`NameInputField ${errors.name ? "input-error" : ""}`} 
                            value={formData.name}
                            onChange={(e) => handleInput(e, 'name')}
                        />
                        {errors.name && <span className="ErrorText">{errors.name}</span>}
                    </div>

                    {/* Last Name */}
                    <div className="InputGroup">
                        <label className="InputLabel">Last Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Livaditis" 
                            className={`LastNameInputField ${errors.lastname ? "input-error" : ""}`}
                            value={formData.lastname}
                            onChange={(e) => handleInput(e, 'lastname')}
                        />
                        {errors.lastname && <span className="ErrorText">{errors.lastname}</span>}
                    </div>

                    {/* Email */}
                    <div className="InputGroup">
                        <label className="InputLabel">University Email</label>
                        <input 
                            type="email" 
                            placeholder="student@university.edu" 
                            className={`EmailInputField ${errors.email ? "input-error" : ""}`} 
                            value={formData.email}
                            onChange={(e) => handleInput(e, 'email')}
                        />
                        {errors.email && <span className="ErrorText">{errors.email}</span>}
                    </div>

                    {/* Semester Input (NEW) */}
                    <div className="InputGroup">
                        <label className="InputLabel">Current Semester</label>
                        <input 
                            type="number" 
                            min="1"
                            max="12"
                            placeholder="e.g. 3" 
                            className={`SemesterInputField ${errors.semester ? "input-error" : ""}`}
                            value={formData.semester}
                            onChange={(e) => handleInput(e, 'semester')}
                        />
                        {errors.semester && <span className="ErrorText">{errors.semester}</span>}
                    </div>

                    {/* Password */}
                    <div className="InputGroup">
                        <label className="InputLabel">Password</label>
                        <input 
                            type="password" 
                            placeholder="Min. 6 characters" 
                            className={`PasswordInputField ${errors.password ? "input-error" : ""}`}
                            value={formData.password}
                            onChange={(e) => handleInput(e, 'password')}
                        />
                        {errors.password && <span className="ErrorText">{errors.password}</span>}
                    </div>
                    
                    <hr className="SectionDivider" />

                    {/* INTERESTS SECTION */}
                    <div className="SectionHeader">Select Your Interests</div>
                    <div className="CheckboxGrid">
                        {availableInterests.map(interest => (
                            <label key={interest.id} className="CheckboxLabel">
                                <input 
                                    type="checkbox" 
                                    checked={selectedInterests.includes(interest.id)}
                                    onChange={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                                />
                                {interest.name}
                            </label>
                        ))}
                    </div>

                    <hr className="SectionDivider" />

                    {/* LESSONS SECTION */}
                    <div className="SectionHeader">Classes Passed / Taking</div>
                    <div className="LessonsContainer">
                        {Object.keys(lessonsBySemester).map((semester) => (
                            <div key={semester} className="SemesterGroup">
                                <h4>Semester {semester}</h4>
                                <div className="CheckboxGrid">
                                    {lessonsBySemester[semester].map((lesson: Lesson) => (
                                        <label key={lesson.id} className="CheckboxLabel">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLessons.includes(lesson.id)}
                                                onChange={() => toggleSelection(lesson.id, selectedLessons, setSelectedLessons)}
                                            />
                                            {lesson.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="SignUpButton" onClick={handleSubmit}>Sign Up</button>

                    <div style={{ margin: '20px auto', width: 'fit-content' }}>
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Error')} />
                    </div>
                    
                    <div className="LoginRedirect">
                        <span>Already have an account?</span>
                        <Link to="/signin">Sign In</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;