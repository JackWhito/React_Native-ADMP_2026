import React from "react";
import type { Server, ServerChannel } from "@/types";
import ServerChannelsBody from "@/components/ServerChannelsBody";

export default function ServerDetailPanel({
  server,
  onBackToChats,
  onOpenTextChannel,
}: {
  server: Server;
  onBackToChats: () => void;
  onOpenTextChannel?: (channel: ServerChannel) => void;
}) {
  return (
    <ServerChannelsBody
      serverId={server._id}
      serverName={server.name}
      onBack={onBackToChats}
      onOpenTextChannel={onOpenTextChannel}
    />
  );
}
