namespace thdk.rst {
    export interface ISubtitle {
        id: string;
        subtitle: string;
        translation?: string;
    }

    export interface IUser {
        isWatching: boolean;
    }
}

namespace thdk.translate {
    export interface ITranslateService {
        translate(text: string): Promise<string>;
    }

    export namespace google {
        export interface IGoogleConfig {
            apiKey: string;
        }
        export interface IGoogleTranslateConfig extends IGoogleConfig {
        }

        export class GoogleTranslate implements ITranslateService {
            private apiKey: string;
            private network: thdk.network.INetwork;

            constructor(config: IGoogleTranslateConfig, network: thdk.network.INetwork) {
                this.apiKey = config.apiKey;
                this.network = network;
            }

            public translate(text): Promise<string> {
                return this.translateText(text);
            }

            private translateText(text): Promise<string> {
                var url = 'https://translation.googleapis.com/language/translate/v2?key=' + this.apiKey;
                var data = {
                    q: text,
                    target: 'en',
                    format: 'text',
                    source: 'cs',
                    model: 'nmt',
                    key: this.apiKey
                };
                return this.network.postData<{ data: { translations: { model: string, translatedText: string }[] } }>(url, data).then(response => {
                    console.log(response);
                    return response;
                }).then(r => r.data.translations[0].translatedText);
            };
        }
    }
}

namespace thdk.network {
    export interface INetwork {
        postData<T>(url: string, data: any): Promise<T>;
    }

    export class HttpNetwork implements INetwork {
        private http = function (method, url, body, success, error) {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) { return; }
                if (xhr.status >= 400) {
                    // notify('API request failed');
                    console.log('XHR failed', xhr.responseText);
                    error(xhr.responseText);
                    return;
                }
                success(JSON.parse(xhr.responseText));
            };
            xhr.send(body);
        };

        public postData<T>(url, data): Promise<T> {
            return new Promise((resolve, reject) => {
                this.http("POST", url, JSON.stringify(data), resolve, reject);
            });
        }
    }

    export class FetchNetwork implements INetwork {
        public postData<T>(url, data): Promise<T> {
            // Default options are marked with *
            return fetch(url, {
                body: JSON.stringify(data), // must match 'Content-Type' header
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, cors, *same-origin
                redirect: 'follow', // manual, *follow, error
                referrer: 'client', // *client, no-referrer
            })
                .then(response => {
                    if (!response.ok)
                        throw new Error(response.statusText)

                    return response.json()
                });
        }
    }
}