    export interface IMessage {
        type: string;
        payload: any;
    }

    export interface IListener {
        onMessage(message: IMessage): void;
    }

    export interface IBroadcaster {
        onMessage?: (message: IMessage) => void;
        postMessage(type: string, data: any);
        subscribe(listner: IListener);
    }

    export class BroadCaster implements IBroadcaster {
        public onMessage?: (message: IMessage) => void;

        private readonly bc: BroadcastChannel;
        private readonly listner: BroadcastChannel;
        
        private readonly subscribers: IListener[];

        constructor(name: string) {
            this.bc = new BroadcastChannel(name);
            this.listner = new BroadcastChannel(name);
            this.subscribers = [];
            this.listner.onmessage = (e) => {
                if (this.onMessage)
                    this.onMessage(e.data);

                this.subscribers.forEach(s => s.onMessage(e.data));
            }
        }

        public postMessage(type: string, data: any) {
            console.log("broadcaster: postMessage: " + type  + " :");
            console.log(data);
            this.bc.postMessage({ type, payload: data });
        }

        public subscribe(listner: IListener) {
            this.subscribers.push(listner);
        }
    }