import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const Navbar: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email ?? null);
    };
    getUser();

    // Optional: subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-black border-b shadow-sm">
      <span className="font-semibold text-lg text-white uppercase">
        ✨ Quiet Pages ✨{" "}
      </span>
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-gray-400">{userEmail}</span>
        )}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm rounded-md bg-white text-red-600 hover:bg-gray-200 transition"
        >
          Log out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
