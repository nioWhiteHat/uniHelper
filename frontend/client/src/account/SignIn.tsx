import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignIn.css";
import { API_URL } from '../config';
const SignIn = () => {
    const navigate = useNavigate() 
    // 1. State to hold input values
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    // 2. State to hold error messages
    const [errors, setErrors] = useState({
        email: "",
        password: ""
    });

    // Handle typing in inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        
        // Clear error when user starts typing again
        if (errors[e.target.name as keyof typeof errors]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    // 3. The Validation Logic
    const handleSubmit = () => {
        let isValid = true;
        const newErrors = { email: "", password: "" };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email address.";
            isValid = false;
        }
        const passwordRegex = /^[a-zA-Z0-9]+$/;

        if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters.";
            isValid = false;
        } else if (!passwordRegex.test(formData.password)) {
            newErrors.password = "Password must contain numbers and letters only (no symbols).";
            isValid = false;
        }

        setErrors(newErrors);

        if (isValid) {
            fetch(`${API_URL}/SignIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then( async response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return await response.json();
            })
            .then(data => {
                console.log("Login successful:", data);
                localStorage.setItem("token", data.token);
                navigate('/FeedPage')
            })
            .catch(error => {
                console.error("Login failed:", error);
                // Handle login failure
            });
            console.log("Form is valid! Logging in...", formData);
        }
    };

    return (
        <div className="SignInPage">
            <div className="SignInCard">
                <h2>Sign In</h2>
                <div className="CredentialContainerForSignIn">
                    {/* Email Input */}
                    <div className="InputWrapper">
                        <input 
                            type="text" 
                            name="email"
                            placeholder="Email" 
                            className={`UsernameInputField ${errors.email ? "error" : ""}`}
                            value={formData.email}
                            onChange={handleChange}
                        />
                        {errors.email && <span className="ErrorMessage">{errors.email}</span>}
                    </div>

                    {/* Password Input */}
                    <div className="InputWrapper">
                        <input 
                            type="password" 
                            name="password"
                            placeholder="Password" 
                            className={`PasswordInputField ${errors.password ? "error" : ""}`}
                            value={formData.password}
                            onChange={handleChange}
                        />
                        {errors.password && <span className="ErrorMessage">{errors.password}</span>}
                    </div>

                    <button className="SignInButton" onClick={handleSubmit}>
                        Sign In
                    </button>
                    
                    <div className="CreateAccount">
                        <span>Don't have an account?</span>
                        <Link to="/SignUp">Sign Up</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;