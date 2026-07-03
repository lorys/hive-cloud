import "ws";

declare module "ws" {
  interface WebSocket {
    hive: {
        sentInformations?: boolean,
        hasChunks?: Set
    }
  }
  
}