import "ws";

declare module "ws" {
  interface WebSocket {
    hive: {
        sentInformations?: boolean
    }
  }
}