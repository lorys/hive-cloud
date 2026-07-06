export const chunk_size = 1_048_576;
export const chunk_infos_size = 41;
export const chunk_header_size = 7;
export const chunk_id_size = 34;
export const chunk_state_treshold = 5;

export const chunk_redundancy = 10;
export const chunk_start_redundancy = 20;

export const enums = {
    client: {
        questions: {
            total_clients_having_chunk: 0x30,
        },
        actions: {
            broadcast_chunk: 0x40,
            send_chunk: 0x41
        },
        infos: 0x50
    },
    server: {
        questions: {
            have_chunk_and_send: 0x00,
            have_chunk: 0x01
        },
        actions: {
            store_chunk: 0x10
        },
        infos: 0x20
    }
}

export const categories = {
    client: {
        questions: 0x30,
        actions: 0x40,
        infos: 0x50
    },
    server: {
        questions: 0x00,
        actions: 0x10,
        infos: 0x20
    }
};