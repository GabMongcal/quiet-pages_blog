import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

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
    <nav
      className="fixed top-0 left-0 z-50 w-full
flex flex-col md:flex-row
items-start md:items-center
justify-between
px-4 md:px-6
py-3 md:py-4
bg-black shadow-md border-b border-gray-700"
    >
      <div className="flex items-center justify-between w-full md:w-auto">
        <span className="font-bold text-lg md:text-xl text-white uppercase tracking-wide">
          ✨ Quiet Pages ✨
        </span>

        {/* Hamburger button (mobile only) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-2xl focus:outline-none"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
      <div
        className={`${menuOpen ? "flex" : "hidden"} md:flex
flex-col md:flex-row
items-stretch md:items-center
gap-2 md:gap-4
mt-3 md:mt-0
w-48 md:w-auto
md:static
absolute right-4 top-full
bg-black md:bg-transparent
p-3 md:p-0
rounded-lg md:rounded-none
shadow-lg md:shadow-none
border border-gray-700 md:border-none`}
      >
        {userEmail && (
          <span
            className="block text-[10px] sm:text-xs md:text-sm text-gray-300 font-medium
                       truncate max-w-full md:max-w-xs"
            title={userEmail}
          >
            {userEmail}
          </span>
        )}
        <Link to="/blogs/create">
          <button
            onClick={() => setMenuOpen(false)}
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-white text-black font-medium
hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
          >
            Create Blog
          </button>
        </Link>
        <button
          onClick={() => {
            setMenuOpen(false);
            handleLogout();
          }}
          className="w-full md:w-auto px-4 py-2 rounded-lg bg-red-600 text-white font-medium
hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
