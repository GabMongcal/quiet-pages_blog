import { useEffect, useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./Navbar";
import { supabase } from "../supabaseClient";

interface Blog {
  id: number;
  title: string;
  content: string;
  created_at: string;
  image_url: string | null;
  user_id: string; // Add this for author checks
  username: string; // Add username for display
}

interface Comment {
  id: number;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string; // Add this for author checks
  username: string; // Add username for display
}
// Main BlogView component
const BlogView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [openMenu, setOpenMenu] = useState(false);

  // Current logged-in user's UID, used for author-only actions
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  /**
   * Stores the comment ID whose kebab menu is currently open.
   * Only one comment menu can be open at a time.
   */
  const [openCommentMenuId, setOpenCommentMenuId] = useState<number | null>(
    null,
  );

  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Preview URL of the selected comment image
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(
    null,
  );
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [postingComment, setPostingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual refresh handler for comments (moved inside component, after id and setComments are defined)
  const handleRefreshComments = async () => {
    if (!id) return;

    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("*")
      .eq("blog_id", id)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments(commentsData || []);
    } else {
      console.error("Failed to refresh comments:", error);
    }
  };
  useEffect(() => {
    const fetchBlog = async () => {
      // Fetch blog data including user_id and username for author checks and display
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Failed to fetch blog:", error);
        return;
      }

      setBlog(data);
      // Fetch comments for the blog including user_id and username for author checks and display
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("blog_id", id)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Failed to fetch comments:", commentsError);
      } else {
        setComments(commentsData || []);
      }
    };

    fetchBlog();
  }, [id]);

  // Real-time comments sync across all devices/users (Supabase Realtime v2 Channel API)
  useEffect(() => {
    if (!id) return;

    // Create a channel for this blog's comments
    const channel = supabase
      .channel(`realtime-comments-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `blog_id=eq.${id}`,
        },
        async () => {
          // Re-fetch all comments ordered oldest -> newest
          const { data: commentsData, error } = await supabase
            .from("comments")
            .select("*")
            .eq("blog_id", id)
            .order("created_at", { ascending: true });

          if (!error) {
            setComments(commentsData || []);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);
  /**
   * Deletes the blog, its image, and all related comment images.
   * This prevents orphan files in Supabase Storage.
   */
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Delete this blog?");
    if (!confirmDelete || !blog) return;

    /**
     * 1️⃣ Delete blog image from storage (if exists)
     */
    if (blog.image_url) {
      const filePath = blog.image_url.split("/blog-images/")[1];

      if (filePath) {
        const { error: blogImageError } = await supabase.storage
          .from("blog-images")
          .remove([filePath]);

        if (blogImageError) {
          alert("Failed to delete blog image: " + blogImageError.message);
          return;
        }
      }
    }

    /**
     * 2️⃣ Fetch all comments with images for this blog
     */
    const { data: commentImages, error: commentFetchError } = await supabase
      .from("comments")
      .select("image_url")
      .eq("blog_id", id)
      .not("image_url", "is", null);

    if (commentFetchError) {
      alert("Failed to fetch comment images: " + commentFetchError.message);
      return;
    }

    /**
     * 3️⃣ Delete all comment images from storage
     */
    if (commentImages && commentImages.length > 0) {
      const imagePaths = commentImages
        .map((c) => c.image_url?.split("/comment-images/")[1])
        .filter(Boolean) as string[];

      if (imagePaths.length > 0) {
        const { error: commentImageError } = await supabase.storage
          .from("comment-images")
          .remove(imagePaths);

        if (commentImageError) {
          alert(
            "Failed to delete comment images: " + commentImageError.message,
          );
          return;
        }
      }
    }

    /**
     * 4️⃣ Delete the blog record (comments are deleted via FK or cascade)
     */
    const { error } = await supabase.from("blogs").delete().eq("id", id);

    if (error) {
      alert("Failed to delete blog: " + error.message);
      return;
    }

    /**
     * 5️⃣ Navigate back to blog list after successful delete
     */
    navigate("/blogs");
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create a local preview URL for the selected comment image
      const previewUrl = URL.createObjectURL(file);
      setCommentImagePreview(previewUrl);
    } else {
      // If input cleared, reset preview
      setImageFile(null);
      setCommentImagePreview(null);
    }
  };

  const handleAddComment = async () => {
    setPostingComment(true);
    if (!comment.trim()) {
      setPostingComment(false);
      return;
    }

    let imageUrl: string | null = null;

    /* Upload image if selected */
    if (imageFile) {
      const safeFileName = imageFile.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9.-]/g, "");
      const fileName = `${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("comment-images")
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: imageFile.type,
        });
      if (uploadError) {
        console.error("UPLOAD ERROR 👉", uploadError);
        alert("Image upload failed: " + uploadError.message);
        setPostingComment(false);
        return;
      }
      const { data } = supabase.storage
        .from("comment-images")
        .getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    // Get current logged-in user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Fetch the username from the profiles table instead of user_metadata
    // This ensures we do not insert a null username and avoid DB constraint errors
    let userName: string | null = null;
    if (userId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      if (profileData?.username) {
        userName = profileData.username;
      } else {
        // If username is not found, log a warning (do not insert null username)
        console.warn("Username not found in profiles table for user", userId);
      }
    }

    // Insert comment with user_id and username for author-only actions like delete and display
    const { error } = await supabase.from("comments").insert({
      blog_id: id,
      content: comment,
      image_url: imageUrl,
      user_id: userId || null, // save the logged-in user's UID
      username: userName, // retrieved from profiles table
    });

    if (error) {
      console.error("COMMENT INSERT ERROR 👉", error);
      alert("Failed to post comment: " + error.message);
      setPostingComment(false);
      return;
    }

    setComment("");
    setImageFile(null);
    setCommentImagePreview(null); // Reset the preview after posting
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setPostingComment(false);

    // Fetch comments again after adding
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("blog_id", id)
      .order("created_at", { ascending: true });
    if (commentsError) {
      console.error("Failed to fetch comments after adding:", commentsError);
    } else {
      setComments(commentsData || []);
    }
  };

  if (!blog) {
    return (
      <div>
        <Navbar />
        <p className="p-8">Loading blog...</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sm text-gray-600 hover:text-black"
            onClick={() => navigate(-1)}
          >
            ⬅ Back
          </button>

          {/* Blog kebab menu (only visible if logged-in user is the blog author) */}
          {currentUserId === blog.user_id && (
            <div className="relative">
              <button
                className="text-xl px-2 rounded hover:bg-gray-100"
                onClick={() => setOpenMenu(!openMenu)}
              >
                ⋮
              </button>

              {openMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-20">
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => navigate(`/blogs/${blog.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blog author username display */}
        <p className="text-sm text-gray-500 mb-1">Author: {blog.username}</p>

        {/* Blog content */}
        <h1 className="text-2xl font-semibold mb-1">{blog.title}</h1>
        <p className="text-xs text-gray-400 mb-4">
          Created on: {new Date(blog.created_at).toLocaleString()}
        </p>

        {blog.image_url && (
          <img
            src={blog.image_url}
            alt="blog"
            onClick={() => setLightboxImage(blog.image_url)}
            className="w-full max-h-100 object-cover rounded-lg mb-4 cursor-pointer"
          />
        )}

        <p className="leading-relaxed text-gray-800 mb-10 whitespace-pre-line">
          {blog.content}
        </p>

        {/* Comments section (UI only) */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">💬 Comments</h3>

          {comments.length === 0 && (
            <p className="text-gray-500">No comments yet.</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="bg-gray-100 rounded-lg p-3 mb-3">
              <div className="flex justify-between">
                <div>
                  {/* Display the commenter's username above the comment content */}
                  <p className="text-sm font-semibold mb-1">{c.username}</p>
                  <p className="text-sm text-gray-800">{c.content}</p>
                </div>

                {/* Kebab menu button for comment */}
                {/* Only show comment kebab menu if logged-in user is the comment author */}
                {currentUserId && currentUserId === c.user_id && (
                  <div className="relative">
                    <button
                      className="text-lg px-2 rounded hover:bg-gray-200"
                      onClick={() =>
                        setOpenCommentMenuId(
                          openCommentMenuId === c.id ? null : c.id,
                        )
                      }
                    >
                      ⋮
                    </button>

                    {/* Kebab menu dropdown */}
                    {openCommentMenuId === c.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-20">
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600"
                          onClick={async () => {
                            setOpenCommentMenuId(null);

                            // Delete comment image if exists
                            if (c.image_url) {
                              const filePath =
                                c.image_url.split("/comment-images/")[1];
                              if (filePath) {
                                const { error: commentImageError } =
                                  await supabase.storage
                                    .from("comment-images")
                                    .remove([filePath]);
                                if (commentImageError) {
                                  alert(
                                    "Failed to delete comment image: " +
                                      commentImageError.message,
                                  );
                                  return;
                                }
                              }
                            }

                            // Delete comment from DB
                            const { error } = await supabase
                              .from("comments")
                              .delete()
                              .eq("id", c.id);

                            if (error) {
                              alert(
                                "Failed to delete comment: " + error.message,
                              );
                              return;
                            }

                            // Refresh comments
                            const { data: commentsData, error: commentsError } =
                              await supabase
                                .from("comments")
                                .select("*")
                                .eq("blog_id", id)
                                .order("created_at", { ascending: true });

                            if (commentsError) {
                              console.error(
                                "Failed to fetch comments after delete:",
                                commentsError,
                              );
                            } else {
                              setComments(commentsData || []);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {c.image_url && (
                <img
                  src={c.image_url}
                  alt="comment"
                  onClick={() => setLightboxImage(c.image_url)}
                  className="mt-2 w-48 h-48 object-cover rounded-md cursor-pointer"
                />
              )}
              <div></div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleRefreshComments}
                className="px-3 py-1 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
              >
                Refresh Comments
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Write a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />

            {postingComment && (
              <p className="text-sm text-gray-500">
                Uploading comment, please wait...
              </p>
            )}

            <label className="inline-block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-600
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-gray-100 file:text-gray-700
                hover:file:bg-gray-200
                cursor-pointer"
              />
            </label>

            {/* Show preview of the selected comment image before posting */}
            {commentImagePreview && (
              <div>
                <p className="mb-1 text-sm">Image Preview:</p>
                <img
                  src={commentImagePreview}
                  alt="comment preview"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}

            <button
              disabled={postingComment}
              className={`self-end px-4 py-1.5 text-sm rounded-md text-white transition
                ${postingComment ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
              onClick={handleAddComment}
            >
              {postingComment ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out"
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

export default BlogView;
