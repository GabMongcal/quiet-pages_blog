/**
 * Blog interface representing a single blog object.
 * Includes the author's username to display in the blog list.
 */
interface Blog {
  id: number;
  title: string;
  content: string;
  created_at: string;
  image_url?: string | null;
  user_id?: string | null;
  username?: string | null;
}
import { supabase } from "../supabaseClient";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Navbar from "./Navbar";
import { fetchBlogs } from "../slices/blogSlice";
import type { RootState, AppDispatch } from "../store";

/*Displays a paginated list of blogs.
 */
const BlogList = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Get blog state from Redux
  const { blogs, loading, error } = useSelector(
    (state: RootState) =>
      state.blogs as { blogs: Blog[]; loading: boolean; error: string | null },
  );

  // Pagination (client-side for simplicity)
  const [page, setPage] = useState(1);

  /*
   * Stores the blog ID whose kebab menu is currently open.
   * Only one menu can be open at a time.
   */
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Get the current logged-in user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  const LIMIT = 5;

  /**
   * Fetch blogs once when component mounts.
   * Data is stored globally in Redux.
   */
  useEffect(() => {
    dispatch(fetchBlogs());
  }, [dispatch]);

  /**
   * Deletes a blog and its associated image (if any),
   * then refreshes the blog list from Redux.
   */
  const handleDelete = async (blog: any) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this blog?",
    );

    if (!confirmDelete) return;

    /**
     * If the blog has an image, remove it from Supabase Storage
     */
    if (blog.image_url) {
      // Extract file path from public URL
      const filePath = blog.image_url.split("/blog-images/")[1];

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("blog-images")
          .remove([filePath]);

        if (storageError) {
          alert("Failed to delete blog image: " + storageError.message);
          return;
        }
      }
    }

    /**
     * 2️⃣ Delete the blog record from the database
     */
    const { error } = await supabase.from("blogs").delete().eq("id", blog.id);

    if (error) {
      alert("Failed to delete blog: " + error.message);
      return;
    }

    /**
     * 3️⃣ Refresh Redux blog list
     */
    dispatch(fetchBlogs());
  };

  // Pagination helpers
  const startIndex = (page - 1) * LIMIT;
  const endIndex = startIndex + LIMIT;
  const paginatedBlogs = blogs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(blogs.length / LIMIT);

  return (
    <div>
      <Navbar />

      <div className="p-8">
        {/* Back to main page */}
        <Link to="/">
          <button className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">
            ⬅ Back
          </button>
        </Link>

        <h2 className="text-2xl font-semibold mb-6">📚 Blogs</h2>

        {/* Loading & error states */}
        {loading && <p>Loading blogs...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && paginatedBlogs.length === 0 && <p>No blogs found.</p>}

        {/* Blog cards */}
        {paginatedBlogs.map((blog) => (
          <div key={blog.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold mb-2">{blog.title}</h3>

            {/* Optional blog image */}
            {blog.image_url && (
              <img
                src={blog.image_url}
                alt="blog"
                className="w-48 h-48 object-cover rounded mb-2"
              />
            )}

            <p className="mb-2">{blog.content}</p>
            {/* Display the username of the author who posted the blog */}
            {blog.username && (
              <p className="italic text-gray-600 mb-1">
                Posted by: {blog.username}
              </p>
            )}
            {/* Blog creation date */}
            <p className="text-sm text-gray-500 mb-3">
              Created on: {new Date(blog.created_at).toLocaleString()}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  navigate(`/blogs/${blog.id}`);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                View
              </button>

              {/* Kebab menu for edit/delete */}
              <div className="relative">
                {/* 
                  Kebab button is now only visible if the logged-in user is the author of the blog.
                */}
                {blog.user_id === currentUserId && (
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === blog.id ? null : blog.id)
                    }
                    className="px-2 py-1 text-2xl leading-none hover:bg-gray-200 rounded"
                  >
                    ⋮
                  </button>
                )}

                {/* Kebab dropdown menu (shown only if current user is the author) */}
                {openMenuId === blog.id && blog.user_id === currentUserId && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-20">
                    <button
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => navigate(`/blogs/${blog.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                      onClick={() => {
                        setOpenMenuId(null);
                        handleDelete(blog);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-4 py-2 rounded ${
                page === 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-200 hover:bg-gray-300"
              } transition`}
            >
              Prev
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className={`px-4 py-2 rounded ${
                page === totalPages
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-200 hover:bg-gray-300"
              } transition`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogList;
