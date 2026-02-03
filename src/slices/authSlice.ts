import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../supabaseClient";

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

// 🔐 check existing session
export const checkSession = createAsyncThunk(
  "auth/checkSession",
  async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutSuccess: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.loading = false;
      })
      .addCase(checkSession.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { logoutSuccess } = authSlice.actions;
export default authSlice.reducer;