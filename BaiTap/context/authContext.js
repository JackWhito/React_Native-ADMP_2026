import { createContext, useContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      console.log("checkAuth response:", res.data);
      setAuthUser(res.data);
      setIsAdmin(res.data.role === "admin");
    } catch (error) {
      console.log("Error in checkAuth:", error.response.data.message);
      setAuthUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isAdmin,
        isCheckingAuth,
        checkAuth,
        setAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);