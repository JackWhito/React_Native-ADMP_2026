import { createContext, useContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import {
  initAuthDB,
  saveAuthUser,
  getAuthUser,
  clearAuthUser,
} from "../db/authDB";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userSQL, setUserSQL] = useState(null);

  const checkAuth = async () => {
    try{
      await initAuthDB();

      const token = await SecureStore.getItemAsync('token');

      if (!token) {
        setIsCheckingAuth(false); 
        setAuthUser(null);
        return;
      }

      const res = await axiosInstance.get("/auth/check");
      await setAuthUser(res.data);
      await saveAuthUser(res.data);
      await setUserSQL(res.data);
    } catch (error) {
      console.log("Error in checkAuth:", error.response.data.message);
      setAuthUser(null);
      clearAuthUser();
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
    (async () => {
      const user = await getAuthUser();
      setUserSQL(user);
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isCheckingAuth,
        checkAuth,
        setAuthUser,
        setIsCheckingAuth,
        userSQL,
        setUserSQL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);