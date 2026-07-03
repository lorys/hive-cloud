import type { HiveCommunication } from "./communication.js";
import type { HiveStorage } from "./storage.js";

export const chunk_size = 1_048_576;

export const enums = {
    client: {
        questions: {
            total_clients_having_chunk: 0x37,
            have_space_to_store_file: 0x38
        },
        actions: {
            broadcast_chunk: 0x49
        },
        infos: 0x51
    },
    server: {
        questions: {
            have_chunk_and_send: 0x00,
            have_chunk: 0x01
        },
        actions: {
            store_chunk: 0x11
        },
        infos: 0x21
    }
};

export interface HiveState {
    communication: HiveCommunication | null;
    storage: HiveStorage | null;
}

// Shared client-side state, populated by start().
export const hive: HiveState = {
    communication: null,
    storage: null
};
