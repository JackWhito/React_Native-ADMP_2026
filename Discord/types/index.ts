export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface MessageSender {
  _id: string;
  name: string;
  username?: string;
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
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerCategory {
  _id: string;
  name: string;
  server: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerChannelCategoryGroup {
  _id: string;
  name: string;
  channels: ServerChannel[];
}

export interface ServerChannelList {
  categories: ServerChannelCategoryGroup[];
  uncategorized: ServerChannel[];
}

export interface ServerInvite {
  inviteCode: string;
  inviteLink: string;
}

export interface ServerMember {
  _id: string;
  name: string;
  username?: string;
  imageUrl?: string;
  role: "admin" | "guest";
}

export interface ServerMembersPayload {
  total: number;
  members: ServerMember[];
  myRole: "admin" | "guest";
}

export interface FriendSearchResult {
  _id: string;
  name: string;
  username?: string;
  imageUrl?: string;
}

export interface FriendInvitePayload {
  code: string;
  link: string;
}

export interface AppNotification {
  _id: string;
  type: "server_invite";
  status: "pending" | "accepted" | "rejected";
  message?: string;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    username?: string;
    imageUrl?: string;
  };
  server?: {
    _id: string;
    name: string;
    imageUrl?: string;
  };
}

export type ServerWithChannels = Server & { channels?: ServerChannel[] };