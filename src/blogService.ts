import { supabase } from "./supabaseClient";

/**
 * Fetch blogs with pagination.
 * @param page Current page number (default 1)
 * @param limit Number of blogs per page (default 5)
 * @returns data and total count
 */
export const getBlogs = async (page = 1, limit = 5) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("blogs")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { data, count };
};

/**
 * Create a new blog.
 * @param title Blog title
 * @param content Blog content
 * @param imageUrl Optional image URL
 * @param userId UID of the author
 * @param username Username of the author
 */
export const createBlog = async (
  title: string,
  content: string,
  imageUrl: string | null,
  userId: string | null,
  username: string | null
) => {
  const { error } = await supabase.from("blogs").insert({
    title,
    content,
    image_url: imageUrl,
    user_id: userId,
    username: username,
  });

  if (error) throw error;
};

/**
 * Update a blog.
 * @param id Blog ID
 * @param title New title
 * @param content New content
 * @param imageUrl Optional new image URL
 */
export const updateBlog = async (
  id: number,
  title: string,
  content: string,
  imageUrl?: string | null
) => {
  const { data, error } = await supabase
    .from("blogs")
    .update({ title, content, image_url: imageUrl })
    .eq("id", id);

  if (error) throw error;
  return data;
};

/**
 * Delete a blog by ID.
 * @param id Blog ID
 */
export const deleteBlog = async (id: number) => {
  const { data, error } = await supabase.from("blogs").delete().eq("id", id);
  if (error) throw error;
  return data;
};