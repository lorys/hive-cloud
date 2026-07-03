export const codes = {
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
            have_chunk: 0x01,
            can_store_chunk: 0x02
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