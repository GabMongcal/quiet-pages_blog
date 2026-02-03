import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../supabaseClient";

export interface Blog {
  id: number;
  title: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  user_id: string; // Added user_id to identify the author of the blog post
}

interface BlogState {
  blogs: Blog[];
  loading: boolean;
  error: string | null;
}

const initialState: BlogState = {
  blogs: [],
  loading: false,
  error: null,
};

// FETCH BLOGS
// Including user_id is necessary for author-only actions (edit/delete) in the UI
export const fetchBlogs = createAsyncThunk(
  "blogs/fetchBlogs",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*, user_id") // Ensure user_id is included in the fetched data
      .order("created_at", { ascending: false });

    if (error) return rejectWithValue(error.message);
    return data;
  }
);

const blogSlice = createSlice({
  name: "blogs",
  initialState,
  reducers: {
    clearBlogs: (state) => {
      state.blogs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.blogs = action.payload;
        state.loading = false;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBlogs } = blogSlice.actions;
export default blogSlice.reducer;