import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignIn.css";
import { API_URL } from '../config';
import { GoogleLogin } from '@react-oauth/google'; // Import Google Component

const SignIn = () => {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [errors, setErrors] = useState({
        email: "",
        password: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name as keyof typeof errors]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    
    const handleSubmit = () => {
     
        let isValid = true; 
      

        if (isValid) {
            fetch(`${API_URL}/SignIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(async response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return await response.json();
            })
            .then(data => {
                localStorage.setItem("token", data.token);
                navigate('/FeedPage');
            })
            .catch(error => console.error("Login failed:", error));
        }
    };


    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            const res = await fetch(`${API_URL}/GoogleSignIn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });

            const data = await res.json();
            
            if (res.ok) {
                console.log("Google Login Success:", data);
                localStorage.setItem("token", data.token);
                navigate('/FeedPage');
            } else {
                console.error("Server refused Google token");
            }
        } catch (err) {
            console.error("Google Request Failed", err);
        }
    };

    return (
        <div className="SignInPage">
            <div className="SignInCard">
                <h2>Sign In</h2>
                
                <div className="CredentialContainerForSignIn">
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
                    
     
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>- OR -</div>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => { console.log('Google Login Failed'); }}
                            useOneTap
                        />
                    </div>
                    {/* ---------------------------------- */}

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