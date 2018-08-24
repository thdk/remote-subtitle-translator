/// <reference path="lib.ts"/>
/// <reference path="../config.ts"/>
/// <reference path="broadcaster.ts"/>
/// <reference path="panels/panels.ts" />
/// <reference path="panels/authentication.ts" />
/// <reference path="panels/settings.ts" />

declare var firebase: any;

namespace thdk.rst {
    export class RemoteSubtitleReceiver {
        private db: any;
        private $container?: JQuery;
        private $toolbar?: JQuery;
        private subtitlePlayerEl: HTMLElement | null;
        private settingsEl: HTMLElement | null;
        private dbSubtitlesRef: any;
        private dbSessionsRef: any;

        private session?: ISession;

        private translateService: translate.ITranslateService;
        private authenticator?: AuthenticationPanel;
        private firebaseApp: any;

        private broadcaster: IBroadcaster;

        constructor(config: IAppConfig, translateService: translate.ITranslateService) {
            this.firebaseApp = firebase.initializeApp({
                apiKey: config.apiKey,
                authDomain: 'czech-subs-1520975638509.firebaseapp.com',
                projectId: 'czech-subs-1520975638509'
            });

            this.broadcaster = new BroadCaster("app");
            this.broadcaster.onMessage = (type, payload) => this.onMessage(type, payload);

            this.translateService = translateService;

            this.subtitlePlayerEl = document.getElementById('subtitle-player');
            this.settingsEl = document.getElementById('settings');

            // authentication

            this.firebaseApp.auth().onAuthStateChanged(user => {
                // unsubscribeOAuthStateChanged();
                if (user) {
                    this.handleLoggedIn(user.uid);
                } else {
                    this.promptAuthentication();
                };
            });


        }

        private onMessage(type: string, data: any) {
            console.log("message received by app.ts: " + type);
            console.log(data);

            switch (type) {
                case 'loggedIn':
                    // const authenticationEl = document.getElementById('authentication');
                    // authenticationEl!.style.display = 'none';
                    this.handleLoggedIn((data as ILoggedInMessage).uid);

                    break;
                case 'panel':
                    if ((data as IPanelMessage).action === "show") {
                        if(this.$toolbar)
                            this.$toolbar.hide();
                    }
                    else if ((data as IPanelMessage).action === "close") {
                        this.subtitlePlayerEl!.style.display = 'block';
                        this.$toolbar!.show();
                    }
                    break;
                case 'loggedOut':
                    // this.promptAuthentication();
                    break;
                default:
                    break;
            }
        }

        private handleLoggedIn(uid: string) {
            this.initCloudFirestoreAsync(uid)
                .then(() => {
                    this.$container = $("#subsContainer");
                    this.$toolbar = $("#toolbar");
                    if (this.authenticator)
                        this.authenticator.close();

                    this.init();
                });
        }

        private promptAuthentication() {
            if (!this.authenticator) {
                const authenticationEl = document.getElementById('authentication');
                if (!authenticationEl) {
                    console.error("authentication element is missing in DOM");
                    return;
                }

                this.authenticator = new AuthenticationPanel({ firebaseApp: this.firebaseApp }, authenticationEl);
                this.authenticator.createAsync().then(() => this.authenticator!.open());
            } else {
                this.authenticator.open();
            }
        }

        private initCloudFirestoreAsync(uid): Promise<void> {
            // Initialize Cloud Firestore through Firebase
            this.db = firebase.firestore();
            const settings = { timestampsInSnapshots: true };
            this.db.settings(settings);

            this.dbSessionsRef = this.db.collection("sessions");

            // TODO: implement firebase auth and replace below uid with the uid of logged in user
            return this.dbSessionsRef.where("uid", "==", uid).orderBy("created", "desc").limit(1)
                .get()
                .then(querySnapshot => {
                    this.session = querySnapshot.docs[0];
                    this.dbSubtitlesRef = this.dbSessionsRef.doc(this.session!.id).collection("subtitles");
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                })
        }

        private init() {
            if (!this.$container || !this.$toolbar || !this.subtitlePlayerEl)
                return;

            this.subtitlePlayerEl.style.display = 'block';

            this.$container.on("click", ".sub", (e) => {
                const $target = $(e.currentTarget);
                const subId = $target.attr("data-subid");
                this.translateService.translate($target.find("p.original").html()).then(translation => {
                    this.dbSubtitlesRef.doc(subId).update({ translation });
                });
            });

            this.$toolbar.on("click touch", ".toggleplayback", (e) => {
                e.preventDefault();
                this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                    this.session!.isWatching = !this.session!.isWatching;
                });
            });

            this.$toolbar.on("click touch", ".settings", (e) => {
                e.preventDefault();

                if (!this.settingsEl)
                    throw "settings element is missing in DOM";

                const panels = document.querySelectorAll('.panel');
                for (let index = 0; index < panels.length; index++) {
                    const panel = panels[index];
                    (panel as HTMLElement).style.display = 'none';
                }

                const settingsPanel = new SettingsPanel(this.settingsEl, this.firebaseApp);
                settingsPanel.createAsync().then(() => settingsPanel.open());
            });

            this.dbSubtitlesRef.orderBy("created")
                .onSnapshot(snapshot => {
                    console.log(snapshot);
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added") {
                            this.addSubtitleToDom(change.doc.data(), change.doc.id);
                        }
                        if (change.type === "modified") {
                            this.titleInDom(change.doc.data(), change.doc.id);
                        }
                        if (change.type === "removed") {
                            throw 'not implemented';
                        }
                    });
                });
        }

        private getSubitleTemplate(sub: ISubtitle, id: string): JQuery {
            const $template = $(`
            <div class="sub" data-subid="${id}">
                <p class="original">${sub.subtitle}</p>
            </div>`);

            if (sub.translation) {
                // TODO: reduce into single append!
                $template.append(`<p class="translation">${sub.translation}</p>`);
                $template.append(`
                <div class="sub-controls">
                    <span class="fav">☆</span>
                    <span class="unfav hide">★</span>
                </div>`);
                $template.append(`<div class="clear"></div>`);
            }

            return $template;
        }

        private addSubtitleToDom(sub: ISubtitle, id: string) {
            if (!this.$container)
                return;

            // todo: use an dictionary to keep reference of subtitles in DOM by id
            const $template = this.getSubitleTemplate(sub, id);
            this.$container.append($template);
            this.scrollDown();
        }

        private titleInDom(sub: ISubtitle, id: string) {
            if (!this.$container)
                return;

            const $template = this.getSubitleTemplate(sub, id);

            // todo: use an dictionary to keep reference of subtitles in DOM by id
            this.$container.find(`.sub[data-subid=${id}]`).replaceWith($template);

        }

        private scrollDown() {
            if (!this.$toolbar)
                return;

            $('html, body').animate({
                scrollTop: this.$toolbar.offset()!.top + 100
            }, 0);
        }
    }
}

$(function () {
    const network = new thdk.network.HttpNetwork();
    const app = new thdk.rst.RemoteSubtitleReceiver(config, new thdk.translate.google.GoogleTranslate(config, network));



});
