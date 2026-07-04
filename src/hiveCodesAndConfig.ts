export const chunk_size = 1_048_576;
export const chunk_infos_size = 42;

export const chunk_redundancy = 10;
export const chunk_start_redundancy = 20;

export const enums = {
    client: {
        questions: {
            total_clients_having_chunk: 0x37,
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