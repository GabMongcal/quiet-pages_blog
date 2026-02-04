import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { updateBlog } from "../blogService";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "./Navbar";
import { supabase } from "../supabaseClient";

const UpdateBlog = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);
  // oldImageUrl = current image saved in the blog (shown as default preview)

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  /**
   * Fetch existing blog data (title, content, image)
   */
  useEffect(() => {
    const fetchBlog = async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("title, content, image_url")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setTitle(data.title);
      setContent(data.content);
      setOldImageUrl(data.image_url);
    };

    fetchBlog();
  }, [id]);

  /**
   * Handle selecting a new image + preview
   * If input is cleared, reset preview and file.
   */
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewImageFile(file);

      // Preview selected image
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      // If file input cleared, reset preview and file
      setNewImageFile(null);
      setImagePreview(null);
    }
  };

  /**
   * Delete old image from Supabase Storage
   */
  const deleteOldImage = async () => {
    if (!oldImageUrl) return;

    const fileName = oldImageUrl.split("/").pop();
    if (!fileName) return;

    await supabase.storage.from("blog-images").remove([fileName]);
  };

  /**
   * Handle blog update (with optional image replace)
   */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newImageUrl = oldImageUrl;

      // If user selected a new image, upload it
      if (newImageFile) {
        // Delete old image first
        await deleteOldImage();

        const safeFileName = newImageFile.name
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.-]/g, "");

        const fileName = `${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-images")
          .upload(fileName, newImageFile, {
            contentType: newImageFile.type,
            upsert: true,
          });

        if (uploadError) {
          alert("Image upload failed");
          return;
        }

        const { data } = supabase.storage
          .from("blog-images")
          .getPublicUrl(fileName);

        newImageUrl = data.publicUrl;
      }

      // Update blog record
      await updateBlog(Number(id), title, content, newImageUrl);

      navigate("/blogs");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!oldImageUrl) return;

    setLoading(true);
    try {
      const fileName = oldImageUrl.split("/").pop();
      if (!fileName) throw new Error("Invalid image URL");

      // Delete from storage
      const { error } = await supabase.storage
        .from("blog-images")
        .remove([fileName]);
      if (error) throw error;

      // Update blog record to remove image URL
      await updateBlog(Number(id), title, content, null);

      // Reset state
      setOldImageUrl(null);
      setNewImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        {/* Back button */}
        <Link to="/blogs">
          <button className="mb-4 px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 transition">
            ⬅ Back
          </button>
        </Link>

        <h2 className="text-2xl font-semibold mb-4">Edit Blog</h2>

        {loading && <p className="text-blue-600 mb-2">Updating blog...</p>}

        <form onSubmit={handleUpdate} className="flex flex-col gap-4 max-w-lg">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Blog title"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            placeholder="Edit your blog content..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />

          {/* Image preview (shows old image by default, updates when new image is selected) */}
          {(imagePreview || oldImageUrl) && (
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {imagePreview ? "New image preview" : "Current image"}
              </p>
              <div className="flex flex-col items-start bg-transparent border border-transparent ">
                <img
                  src={imagePreview || oldImageUrl!}
                  alt="preview"
                  className="w-48 h-48 object-cover rounded-md cursor-pointer"
                  onClick={() => setLightboxImage(imagePreview || oldImageUrl!)}
                />
                {oldImageUrl && !imagePreview && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    className="mt-2 px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    Delete Image
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Select a new image to replace the current one */}
          <label className="inline-block">
            <span className="block text-sm text-gray-600 mb-1">
              Replace blog image (optional)
            </span>
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

          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white transition
              ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
          >
            {loading ? "Updating..." : "Update"}
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

export default UpdateBlog;
