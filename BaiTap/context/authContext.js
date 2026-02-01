import { createContext, useContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import Toast from "react-native-toast-message";
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
    } catch (error) {
      console.log("Error in checkAuth:", error.response.data.message);
      setAuthUser(null);
      clearAuthUser();
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const upload = async (selectedImg) => {
      if(!selectedImg)
      {
          console.log("canceled");
          return
      }
      const formData = new FormData();
      formData.append("avatar", {
          uri: selectedImg.uri,
          name: selectedImg.fileName || "avatar.jpg",
          type: selectedImg.mimeType || "image/jpeg",
      });
      try{
          const res = await axiosInstance.put(
          "/auth/profile",
          formData,
          {
              headers: {
              "Content-Type": "multipart/form-data",
              },
          }
          );
          setAuthUser(res.data);
          saveAuthUser(res.data);
          Toast.show({
              type:"success",
              text1:"Image Updated"
          })
      } catch (error) {
          console.log(error)
      }
  } 

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isCheckingAuth,
        checkAuth,
        setAuthUser,
        setIsCheckingAuth,
        upload
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);