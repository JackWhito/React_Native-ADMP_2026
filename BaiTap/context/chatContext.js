import { createContext, useContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios.js";
import { useAuth } from "./authContext.js";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { authUser } = useAuth();

  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatError, setChatError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [isSending, setIsSending] = useState(false);

  const [participants, setParticipants] = useState([]);
  const [pCount, setPCount] = useState(0);

  const [images, setImages] = useState([]);

  const [links, setLink] = useState([]);

  const getChats = async () => {
    if (!authUser) return;

    try {
      setIsLoadingChats(true);
      setChatError(null);

      const res = await axiosInstance.get("/chat");
      setChats(res.data);
    } catch (error) {
      console.error("Error fetching chats:", error.response?.data || error.message);
      setChatError("Failed to load chats");
    } finally {
      setIsLoadingChats(false);
    }
  };

  const getMessages = async (chatId) => {
    try {
      setLoadingMessages(true);
      const res = await axiosInstance.get(`/message/chat/${chatId}`);
      setMessages(res.data);
    } catch (error) {
      console.error("Get messages failed:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (formData) => {
    try {
      setIsSending(true);

      const res = await axiosInstance.post(
        "/message/send",
        formData,
        {
          headers:{
            "Content-Type": "multipart/form-data",
          }
        }
      );

      setMessages(prev => [...prev, res.data]);
      return res.data;
    } finally {
      setIsSending(false);
    }
  };


  const getParticipants = async (chatId) => {
    try {
      const res = await axiosInstance.get(`/chat/participants/${chatId}`);
      setParticipants(res.data.participants);
      setPCount(res.data.participantsCount);
    } catch (error) {
      console.error("Get participants failed", error);
    }
  };

  const getImages = async (chatId) => {
    try {
      const res = await axiosInstance.get(`/message/image/${chatId}`);
      setImages(res.data);
    } catch (error) {
      console.error("Get images failed", error);
    }
  };

  const getLinks = async (chatId) => {
    try {
      const res = await axiosInstance.get(`/message/links/${chatId}`);
      setLink(res.data);
    } catch (error) {
      console.error("Get links failed", error);
    }
  };

  // Fetch chats when user logs in
  useEffect(() => {
    if (authUser) {
      getChats();
    } else {
      setChats([]);
    }
  }, [authUser]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        isLoadingChats,
        chatError,
        messages,
        loadingMessages,
        isSending,
        participants,
        pCount,
        images,
        links,
        sendMessage,
        getChats,
        refreshChats: getChats,
        getMessages,
        getParticipants,
        getImages,
        getLinks
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChats = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChats must be used within a ChatProvider");
  }
  return context;
};
