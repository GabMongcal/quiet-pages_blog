import { useState, useEffect } from "react";
import { createBlog } from "../blogService";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "./Navbar";
import { supabase } from "../supabaseClient";

const CreateBlog = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(false); // loading state for upload
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Fetch current logged-in user's username from profiles table
   * This is used to associate the blog with the username for display in BlogList
   */
  useEffect(() => {
    const fetchUsername = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (profileData?.username) {
        setUsername(profileData.username);
      }
    };

    fetchUsername();
  }, []);

  /* Handle image file selection and generate a preview */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      // Create a local preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true); // start loading

    try {
      let imageUrl: string | null = null;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Wrap image upload in try/catch to catch unexpected errors
      try {
        if (imageFile) {
          console.log("Starting image upload...");
          const safeFileName = imageFile.name
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9.-]/g, "");

          const fileName = `${Date.now()}-${safeFileName}`;

          const { error: uploadError } = await supabase.storage
            .from("blog-images")
            .upload(fileName, imageFile, {
              cacheControl: "3600",
              upsert: true,
              contentType: imageFile.type,
            });

          if (uploadError) {
            console.error("Upload failed:", uploadError);
            alert("Image upload failed: " + uploadError.message);
            return;
          }

          console.log("Upload succeeded");

          const { data } = supabase.storage
            .from("blog-images")
            .getPublicUrl(fileName);

          console.log("Public URL:", data.publicUrl);

          imageUrl = data.publicUrl;
        }
      } catch (err) {
        console.error("Unexpected error during image upload:", err);
        alert("Unexpected error: " + err);
        return;
      }

      // Call createBlog with title, content, image URL, userId, and username
      await createBlog(
        title,
        content,
        imageUrl,
        userId || null,
        username || null,
      );

      navigate("/blogs");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // stop loading
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar />
      </div>
      <div className="max-w-3xl mx-auto p-6 mt-18">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/">
            <button className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 transition">
              ⬅ Back
            </button>
          </Link>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Create Blog</h2>

        {/* Show loading message while uploading */}
        {loading && (
          <p className="text-blue-600 mb-2">Uploading blog, please wait...</p>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Blog title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog Title"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />

          {/* Blog content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Write your blog..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />

          {/* Image upload */}
          <label className="inline-block">
            <input
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

          {/* Preview the selected image */}
          {imagePreview && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Image Preview</p>
              <div className="inline-block bg-white border border-gray-200 rounded-lg shadow-sm p-2">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-56 h-56 object-cover rounded-md cursor-pointer"
                  onClick={() => setLightboxImage(imagePreview)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
          >
            Create
          </button>
        </form>
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

export default CreateBlog;
