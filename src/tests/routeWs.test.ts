import { describe, expect, it, beforeEach, vi } from 'vitest';
import { routeWs } from '../internals/router';
import { clientQuestionsHandlers } from '../internals/handlers/questions';
import { clientActionsHandlers } from '../internals/handlers/actions';
import { clientAnswersHandlers } from '../internals/handlers/answers';
import { clientInfosHandlers } from '../internals/handlers/informations';
import { enums } from 'hiveCodes';


describe('Should route properly all operations', () => {
    let wsClient: any = null;
    let allWsClients: any = null;

    beforeEach(() => {
        Object.keys(clientQuestionsHandlers).forEach((key: any) => {
            clientQuestionsHandlers[key] = vi.fn();
        })
        Object.keys(clientActionsHandlers).forEach((key: any) => {
            clientActionsHandlers[key] = vi.fn();
        })
        Object.keys(clientAnswersHandlers).forEach((key: any) => {
            clientAnswersHandlers[key] = vi.fn();
        })

        clientInfosHandlers[enums.client.infos] = vi.fn();

        wsClient = {
            send: vi.fn()
        };

        allWsClients = new Array(10).map(() => ({
            send: vi.fn()
        }));
    });

    it('routes questions', async () => {
        const questions = Object.keys(enums.client.questions);
        for (let a = 0; a < questions.length; a++) {
            const buff = new Uint8Array(1);
            const code = (enums.client.questions as any)[questions[a]!];
            buff[0] = code;
            await routeWs(buff, wsClient as any, allWsClients as any);
            expect(clientQuestionsHandlers[code]).toHaveBeenCalled();
        }
    });

    it('routes actions', async () => {
        const actions = Object.keys(enums.client.actions);
        for (let a = 0; a < actions.length; a++) {
            const buff = new Uint8Array(1);
            const code = (enums.client.actions as any)[actions[a]!];
            buff[0] = code;
            await routeWs(buff, wsClient as any, allWsClients as any);
            expect(clientActionsHandlers[code]).toHaveBeenCalled();
        }
    });

    it('routes answers', async () => {
        const actions = Object.keys(enums.server.questions);
        for (let a = 0; a < actions.length; a++) {
            const buff = new Uint8Array(1);
            const code = (enums.server.questions as any)[actions[a]!];
            buff[0] = code;
            await routeWs(buff, wsClient as any, allWsClients as any);
            expect(clientAnswersHandlers[code]).toHaveBeenCalled();
        }
    });

    it('routes infos', async () => {
        const buff = new Uint8Array(1);
        const code = enums.client.infos;
        buff[0] = code;
        await routeWs(buff, wsClient as any, allWsClients as any);
        expect(clientInfosHandlers[code]).toHaveBeenCalled();
    });

});

