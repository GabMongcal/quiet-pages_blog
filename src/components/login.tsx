import React, { useState } from "react";
import { supabase } from "../supabaseClient";

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let emailToUse = "";

    // Check if input is email
    const isEmail = emailOrUsername.includes("@");

    if (isEmail) {
      // Input is email, use it directly
      emailToUse = emailOrUsername;
    } else {
      // Input is username, fetch the corresponding email from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .eq("username", emailOrUsername)
        .single();

      if (profileError || !profileData) {
        alert("Username not found");
        return;
      }

      if (!profileData.email) {
        alert("User email not found in profiles");
        return;
      }

      // Use the email from profiles table for login
      emailToUse = profileData.email;
    }

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    console.log("LOGIN SUCCESS:", data);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-wide">
          ✨ Quiet Pages ✨
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          A calm space to write and read
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 flex flex-col gap-3"
      >
        <h2 className="text-2xl font-semibold text-center mb-2">
          Welcome back
        </h2>

        <input
          type="text"
          placeholder="Username or Email"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-black"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-black"
          required
        />

        <button
          type="submit"
          className="mt-2 w-full py-2 rounded-md text-white transition bg-black hover:bg-gray-800"
        >
          Login
        </button>

        <p className="text-sm text-center text-gray-600 mt-2">
          Don't have an account?{" "}
          <a href="/register" className="text-black hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
};

export default Login;
