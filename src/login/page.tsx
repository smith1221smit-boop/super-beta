import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import api from "./api";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Interface for user data from the API
interface UserData {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  sessionId?: string;
  sessionCookie?: string | null;
}


const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const navigate = useNavigate();



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();


    setLoading(true);
    setError("");
    setDebugInfo("");

    // Basic validation
    if (!email || !password) {
      setError(t('login.validation.emailRequired'));
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", { email });

      const response = await api.post("/users/login", { email, password });
      const responseData = response.data;

      console.log("Login successful:", responseData);

      // Store user data and session ID in localStorage
      if (responseData.user && responseData.user._id) {
        const { _id, username, email, isAdmin } = responseData.user;

        localStorage.setItem("user", JSON.stringify({
          _id,
          username,
          email,
          isAdmin
        }));

        if (responseData.sessionId) {
          localStorage.setItem("sessionId", responseData.sessionId);
        }

        // Navigate to dashboard on success
        navigate("/dashboard");
      } else {
        throw new Error("Invalid response format from server");
      }

    } catch (err: any) {
      console.error("Login error:", err);

      // Enhanced error handling
      let errorMessage = "Login failed. Please try again.";

      if (err.response) {
        // Server responded with an error status
        errorMessage = err.response.data?.message ||
          err.response.statusText ||
          `Error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "No response from server. Please check your connection.";
      } else {
        // Something else happened
        errorMessage = err.message || "An unexpected error occurred.";
      }

      setError(errorMessage);

      // Debug info for development
      if (process.env.NODE_ENV !== 'production') {
        setDebugInfo(JSON.stringify({
          error: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        }, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };



return (
  <div className="min-h-screen bg-gradient-to-br from-[#0b0014] via-[#140024] to-[#1f0033] flex items-center justify-center relative overflow-hidden">

    {/* Background glow */}
    <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-[140px] top-[-150px] left-[-150px] animate-pulse"></div>
    <div className="absolute w-[500px] h-[500px] bg-pink-500/20 blur-[140px] bottom-[-150px] right-[-150px] animate-pulse"></div>

    {/* Main Card */}
    <div className="w-full max-w-6xl grid md:grid-cols-2 bg-black/40 backdrop-blur-2xl border border-purple-500/20 rounded-3xl shadow-2xl overflow-hidden">

      {/* Left Branding Panel */}
      <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-black p-12 relative">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.25),transparent_70%)]"></div>

        <img
          src="./logo.avif"
          alt="logo"
          className="w-28 h-28 mb-6 z-10 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]"
        />

        <h2 className="text-3xl font-bold text-purple-400 z-10">
          SCORE SYNC
        </h2>

        <p className="text-gray-400 text-center mt-4 text-sm z-10 max-w-xs">
          Real-time esports tournament control system with live analytics,
          automation and smart match tracking.
        </p>

        <div className="mt-10 text-purple-300 text-xs z-10">
          Powered by Advanced Tournament Engine
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="p-10 md:p-12 flex flex-col justify-center">

        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-purple-400 mb-2">
            Welcome Back 👋
          </h1>
          <p className="text-gray-400 text-sm">
            Login to continue to your dashboard
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">

          {/* Email */}
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="mt-2 w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="mt-2 w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>


          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white tracking-wide transition-all duration-300 ${
              loading
                ? "bg-purple-900 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 hover:shadow-[0_0_25px_rgba(168,85,247,0.7)]"
            }`}
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-10 text-center text-gray-500 text-xs">
          © 2026 ScoreSync. All rights reserved.
        </div>
      </div>
    </div>
  </div>
);
};

export default Login;
