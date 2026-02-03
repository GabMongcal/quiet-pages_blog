import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/login";
import Register from "./components/register";
import MainPage from "./components/MainPage";
import BlogList from "./components/BlogList";
import CreateBlog from "./components/CreateBlog";
import UpdateBlog from "./components/UpdateBlog";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Navigate } from "react-router-dom";
import BlogView from "./components/BlogView";

function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      setCheckingAuth(false);
    };

    checkSession();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main / Blog pages */}
        <Route
          path="/"
          element={
            checkingAuth ? null : isAuthenticated ? (
              <MainPage />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/blogs"
          element={
            checkingAuth ? null : isAuthenticated ? (
              <BlogList />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/blogs/create"
          element={
            checkingAuth ? null : isAuthenticated ? (
              <CreateBlog />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/blogs/:id"
          element={
            checkingAuth ? null : isAuthenticated ? (
              <BlogView />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/blogs/:id/edit"
          element={
            checkingAuth ? null : isAuthenticated ? (
              <UpdateBlog />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* fallback for unmatched routes: 
            For Vercel and SPA deployments, ensure unmatched routes are handled via Navigate.
        */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
