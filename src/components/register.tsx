import { useState } from "react";
import { supabase } from "../supabaseClient";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Sign up the user with email and password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Failed to retrieve user ID after sign up.");
        return;
      }

      // 2️⃣ Insert both username and email into the 'profiles' table
      //    (Assumes 'profiles' table has 'id', 'username', and 'email' columns)
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId, // reference to auth.users.id
        username: username,
        email: email, // Save email as well
      });

      if (profileError) {
        setError("Failed to save username: " + profileError.message);
        return;
      }

      // 3️⃣ Success state + redirect after short delay
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 flex flex-col gap-3"
      >
        <h2 className="text-2xl font-semibold text-center mb-2">
          Create account
        </h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
  focus:outline-none focus:ring-2 focus:ring-black"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
  focus:outline-none focus:ring-2 focus:ring-black"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
  focus:outline-none focus:ring-2 focus:ring-black"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
  focus:outline-none focus:ring-2 focus:ring-black"
        />

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 w-full py-2 rounded-md text-white transition
    ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 text-center">
            Account created successfully!
          </p>
        )}
        <p className="text-sm text-center text-gray-600 mt-2">
          Have an account?{" "}
          <a href="/login" className="text-black hover:underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
};

export default Register;
