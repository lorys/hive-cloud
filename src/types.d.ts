import "ws";

declare module "ws" {
  interface WebSocket {
    hive: {
        sentInformations?: boolean,
        hasChunks?: Set<string>,
        totalStorage?: number,
        usedStorage?: number
    }
  }
  
}