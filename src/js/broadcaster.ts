namespace thdk {
    export interface IMessage {
        type: string;
        payload: any;
    }

    export interface IListener {
        onMessage(message: IMessage): void;
    }

    export interface IBroadcaster {
        onMessage?: (type: string, payload: any) => void;
        postMessage(type: string, data: any);
    }

    export class BroadCaster implements IBroadcaster {
        public onMessage?: (type: string, payload: any) => void;

        private readonly bc: BroadcastChannel;
        private readonly listner: BroadcastChannel;

        constructor(name: string) {
            this.bc = new BroadcastChannel(name);
            this.listner = new BroadcastChannel(name);
            this.listner.onmessage = (e) => {
                if (this.onMessage)
                    this.onMessage(e.data.type, e.data.payload);
            }
        }

        public postMessage(type: string, data: any) {
            console.log("broadcaster: postMessage: " + type  + " :");
            console.log(data);
            this.bc.postMessage({ type, payload: data });
        }
    }
}