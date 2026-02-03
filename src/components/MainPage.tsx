import { Link } from "react-router-dom";
import Navbar from "./Navbar";

const MainPage = () => {
  return (
    <div>
      <div className="sticky top-0 w-full z-50 shadow-md bg-white">
        <Navbar />
      </div>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-4 uppercase">✨ Quiet Pages ✨</h1>
        <p className="text-gray-700 mb-6">Welcome! What do you want to do?</p>

        <div className="flex justify-center gap-4 mb-6">
          <Link to="/blogs">
            <button className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 transition">
              View Blogs
            </button>
          </Link>

          <Link to="/blogs/create">
            <button className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 transition">
              Create Blog
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
