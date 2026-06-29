let hive = null;

class Hive {
    #ws;

    #constructor(ws) {
        this.#ws = ws;
    }

    connect() {
        if (this.#ws.readyState === WebSocket.OPEN) {
            return this.#ws;
        }
        this.#ws = new WebSocket("ws://"+window.location.host+"/hive");

        return new Promise((res, rej) => {
            this.#ws.onopen = res;
            this.#ws.onerror = rej;
        });
    }

    async init() {
        const hive = new Hive();
        await hive.connect();

        return hive;
    }
}

async function start() {
    hive = await Hive.init();
}