//import { API_URL } from "@env";
//import AsyncStorage from "@react-native-async-storage/async-storage";
//import { jwtDecode } from 'jwt-decode';

export const handleSignUp = async ({ username, password, email}) => {
    try {
        // console.log("API URL:", API_URL);

        console.log("Signup data:", { username, email, password });

        const response = await fetch(`http://192.168.100.5:7070/api/v1/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, email }),
        });

        const responseText = await response.text();
        console.log("Signup raw response:", responseText);

        let data = {};
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = {};
            }
        }

        if (response.ok) {
            return {
                ok: true,
                data: { detail: "Check your email" }
            };
        } else {
            return {
                ok: false,
                data: { detail: data.message || data.detail || "Registration failed." }
            };
        }

    } catch (error) {
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};


export const handleVerify = async ({ code, email }) => {
    try {
        // console.log("API URL:", API_URL);

        const response = await fetch(`http://192.168.100.5:7070/api/v1/auth/verify-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, email }),
        });

        if (response.ok) {
            return {
                ok: true,
                data: { detail: "Email verified successfully" }
            };
        } else {
            const errorText = await response.text();
            let detail = "Verification failed.";
            try {
                const errorData = JSON.parse(errorText);
                detail = errorData.message || errorData.detail || detail;
            } catch {
                detail = errorText || detail;
            }
            return {
                ok: false,
                data: { detail }
            };
        }

    } catch (error) {
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};


export const handleLogin = async ({ email, password }) => {
    try {
        // console.log("API URL:", API_URL);
        const response = await fetch(`http://192.168.100.5:7070/api/v1/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const responseText = await response.text();
        console.log("Login raw response:", responseText);
        
        let data = {};
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                return {
                    ok: false,
                    data: { detail: "Server response error" }
                };
            }
        }

        return {
            ok: response.ok,
            data: response.ok ? data : { detail: data?.detail || "Login failed" }
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};