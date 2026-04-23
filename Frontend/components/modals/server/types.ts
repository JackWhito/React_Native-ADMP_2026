import type { ServerChannel, ServerInvite, ServerMember, ServerMembersPayload } from "@/types";

export type SearchChannelItem = ServerChannel & { categoryName: string };

export type InviteConversationItem = {
  _id: string;
  member: { _id: string; name: string; username?: string };
};

export type { ServerInvite, ServerMember, ServerMembersPayload };
