export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface MessageSender {
  _id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

export interface Message {
  _id: string;
  chat: string;
  sender: MessageSender | string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatLastMessage {
  _id: string;
  text: string;
  sender: string;
  createdAt: string;
}

export interface Chat {
  _id: string;
  member: MessageSender;
  lastMessage: ChatLastMessage | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface Server{
    _id: string;
    name: string;
    imageUrl: string;
}

export type ServerChannelType = "text" | "audio" | "video";

export interface ServerChannel {
  _id: string;
  name: string;
  type: ServerChannelType;
  server: string;
  createdAt: string;
  updatedAt: string;
}

export type ServerWithChannels = Server & { channels?: ServerChannel[] };