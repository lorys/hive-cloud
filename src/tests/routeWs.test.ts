import { describe, expect, test, vi } from 'vitest';
import { routeWs } from '../internals/router';
import { clientQuestionsHandlers } from '../internals/handlers/questions';
// import { clientActionsHandlers } from '../internals/handlers/actions';
// import { clientAnswersHandlers } from '../internals/handlers/answers';
// import { clientInfosHandlers } from '../internals/handlers/informations';
import { enums } from '../hiveCodesAndConfig';


describe('Should route properly all operations', () => {

    clientQuestionsHandlers[enums.client.questions.total_clients_having_chunk] = vi.fn();

    const wsClient = {
        send: vi.fn()
    };

    const allWsClients = new Array(10).map(() => ({
        send: vi.fn()
    }))

    test('route questions', async () => {
        const buff = new Uint8Array(1);
        buff[0] = enums.client.questions.total_clients_having_chunk;
        await routeWs(buff, wsClient as any, allWsClients as any);
        expect(clientQuestionsHandlers[enums.client.questions.total_clients_having_chunk]).toHaveBeenCalled();
    });

});

