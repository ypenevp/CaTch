//import { API_URL } from "@env";
//import AsyncStorage from "@react-native-async-storage/async-storage";
//import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.EXPO_PUBLIC_API_URL

export const handleSignUp = async ({ username, password, email}) => {
    try {
        console.log("API URL:", API_URL);

        console.log("Signup data:", { username, email, password });

        const response = await fetch(`${API_URL}/api/v1/auth/register`, {
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
        console.log("API URL:", API_URL);

        const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
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
        console.log("API URL:", API_URL);
        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
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
            data: response.ok ? data : { detail: data?.message || data?.detail || "Login failed" }
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};

export const handleForgotPassword = async ({ email }) => {
    try {
        console.log("API URL:", API_URL);

        const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            return {
                ok: true,
                data: { detail: "Check your email" }
            };
        } else {
            const errorText = await response.text();
            let detail = "Could not send reset code.";
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


export const handleResetPassword = async ({ email, code, newPassword, confirmPassword }) => {
    try {
        console.log("API URL:", API_URL);

        const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, code, newPassword, confirmPassword }),
        });

        if (response.ok) {
            return {
                ok: true,
                data: { detail: "Password reset successfully" }
            };
        } else {
            const errorText = await response.text();
            let detail = "Password reset failed.";
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


export const handleRefresh = async ({ refreshToken }) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        const responseText = await response.text();

        let data = {};
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = {};
            }
        }

        return {
            ok: response.ok,
            data: response.ok ? data : { detail: data?.message || data?.detail || "Session expired" }
        };
    } catch (error) {
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};


export const handleLogout = async ({ refreshToken }) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        return {
            ok: response.ok,
            data: { detail: response.ok ? "Logged out" : "Logout failed" }
        };
    } catch (error) {
        return {
            ok: false,
            data: { detail: `Network error: ${error.message}` }
        };
    }
};

export const handleResendCode = async ({ email }) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/auth/resend-code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            return {
                ok: true,
                data: { detail: "A new code was sent to your email." }
            };
        } else {
            const errorText = await response.text();
            let detail = "Could not resend code.";
            try {
                const errorData = JSON.parse(errorText);
                detail = errorData.message || errorData.detail || detail;
            } catch {
                detail = errorText || detail;
            }
            return {
                ok: false,
                status: response.status,
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
