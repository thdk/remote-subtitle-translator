import * as pubsub from 'pubsub-js'
import { IListener, IBroadcaster, IMessage } from './interfaces';

export class PubSubBroadcaster implements IBroadcaster {
    private readonly topic: string;
    private readonly subscriptions: Map<IListener, () => void>
    constructor(topic = "app") {
        this.topic = topic;
        this.subscriptions = new Map();
    }

    public postMessage<T extends IMessage>(type: T["type"], data: T["payload"]) {
        pubsub.publish(this.topic, Object.assign({ type }, data));
    }

    public subscribe(listener: IListener) {
        const unsubscribe = pubsub.subscribe(this.topic, (topic, data) => {
            listener.onMessage({ type: data.type, payload: data });
        });

        this.subscriptions.set(listener, unsubscribe);
    }

    public unsubscribe(listener: IListener) {
        this.subscriptions.get(listener)!();
    }

    public dispose() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
    }
}
