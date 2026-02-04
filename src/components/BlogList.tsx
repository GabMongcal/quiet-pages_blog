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

  // Lightbox state for full-view image modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  useEffect(() => {
    const channel = supabase
      .channel("realtime-blogs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blogs",
        },
        () => {
          // Re-fetch blogs on any insert/update/delete
          dispatch(fetchBlogs());
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const sortedBlogs = [...blogs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const paginatedBlogs = sortedBlogs.slice(startIndex, endIndex);
  const totalPages = Math.ceil(blogs.length / LIMIT);

  return (
    <div className="mx-4 md:mx-16 lg:mx-40">
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar />
      </div>

      <div className="p-8 pt-28">
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
          <div
            key={blog.id}
            className="relative bg-white rounded-lg shadow-md p-4 md:p-6 mb-6"
          >
            <h3 className="text-xl font-bold mb-2">{blog.title}</h3>

            {/* Optional blog image */}
            {blog.image_url && (
              <img
                src={blog.image_url}
                alt="blog"
                className="w-full max-w-xs md:w-48 md:h-48 object-cover rounded mb-3 cursor-pointer"
                onClick={() => setLightboxImage(blog.image_url ?? null)}
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
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
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
              <div className="absolute top-3 right-3">
                {/* 
                  Kebab button is now only visible if the logged-in user is the author of the blog.
                */}
                {blog.user_id === currentUserId && (
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === blog.id ? null : blog.id)
                    }
                    className="px-3 py-2 text-xl leading-none hover:bg-gray-200 rounded-md touch-manipulation"
                    aria-label="More options"
                  >
                    ⋮
                  </button>
                )}

                {/* Kebab dropdown menu (shown only if current user is the author) */}
                {openMenuId === blog.id && blog.user_id === currentUserId && (
                  <div className="absolute right-0 top-full mt-2 w-36 bg-white border rounded-lg shadow-xl z-30">
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
          <div className="mt-10 flex flex-row justify-center items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-5 py-2 rounded-full text-sm font-medium ${
                page === 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Prev
            </button>

            <span className="text-sm text-gray-600 font-medium">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className={`px-5 py-2 rounded-full text-sm font-medium ${
                page === totalPages
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200"
              } transition`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="full-view"
            className="max-w-[90%] max-h-[90%] rounded-lg shadow-xl"
          />
        </div>
      )}
    </div>
  );
};

export default BlogList;
