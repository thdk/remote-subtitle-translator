import * as pubsub from 'pubsub-js'

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

export class PubSubBroadcaster implements IBroadcaster {
    private readonly topic: string;
    constructor(topic = "app") {
        this.topic = topic;
    }

    public postMessage(type: string, data: any) {
        pubsub.publish(this.topic, Object.assign({ type }, data));
    }

    public subscribe(listner: IListener) {
        pubsub.subscribe(this.topic, (topic, data) => {
            listner.onMessage({ type: data.type, payload: data });
        });
    }
}
