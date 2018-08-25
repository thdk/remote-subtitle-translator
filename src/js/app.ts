import { config, IAppConfig } from '../config';

import { IBroadcaster, BroadCaster } from './broadcaster';
import { AuthenticationPanel } from './panels/authentication';
import { ISession, ITranslateService, ILoggedInMessage, ISubtitle, HttpNetwork, GoogleTranslate } from './lib';
import { IPanelMessage } from './panels/panels';
import { SettingsPanel } from './panels/settings';

declare const firebase: any;

export class RemoteSubtitleReceiver {
    private firestore?: any;
    private $container?: JQuery;
    private $toolbar?: JQuery;
    private subtitlePlayerEl: HTMLElement | null;
    private settingsEl: HTMLElement | null;
    private dbSubtitlesRef?: any;
    private dbSessionsRef?: any;
    private dbFavoriteSubtitlesRef?: any;

    private session?: ISession;

    private translateService: ITranslateService;
    private authenticator?: AuthenticationPanel;
    private firebaseApp: any;

    private broadcaster: IBroadcaster;

    constructor(config: IAppConfig, translateService: ITranslateService) {
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
                    if (this.$toolbar)
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
        this.firestore = firebase.firestore();
        const settings = { timestampsInSnapshots: true };
        this.firestore.settings(settings);

        this.dbSessionsRef = this.firestore.collection("sessions");
        this.dbFavoriteSubtitlesRef = this.firestore.collection("favorites");

        // TODO: implement firebase auth and replace below uid with the uid of logged in user
        return this.dbSessionsRef.where("uid", "==", uid).orderBy("created", "desc").limit(1)
            .get()
            .then(querySnapshot => {
                this.session = querySnapshot.docs[0];
                this.dbSubtitlesRef = this.dbSessionsRef!.doc(this.session!.id).collection("subtitles");
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            })
    }

    private init() {
        if (!this.$container || !this.$toolbar || !this.subtitlePlayerEl)
            return;

        this.subtitlePlayerEl.style.display = 'block';

        this.$container.on("click", ".sub", e => {
            const $target = $(e.currentTarget);
            const subId = $target.attr("data-subid");
            this.translateService.translate($target.find("p.original").html()).then(translation => {
                if (this.dbSubtitlesRef) {
                    this.dbSubtitlesRef.doc(subId).update({ translation });
                } else {
                    throw new Error("Can't update subtitle: dbSubtitlesRef is undefined.");
                }
            });
        });

        this.$container.on("click", ".fav, .unfav", e => {
            const $target = $(e.currentTarget);
            const subId = $target.closest(".sub").attr("data-subid");
            if (!subId) {
                throw new Error("Can't add subtitle to favorites. No element .sub found with attibute: data-subid");
            }

            this.toggleSubtitleInFavoritesAsync(subId);
        });

        this.$toolbar.on("click touch", ".toggleplayback", e => {
            e.preventDefault();

            if (!this.dbSessionsRef) return;

            this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                this.session!.isWatching = !this.session!.isWatching;
            });
        });

        this.$toolbar.on("click touch", ".settings", e => {
            e.preventDefault();

            const panels = document.querySelectorAll('.panel');
            for (let index = 0; index < panels.length; index++) {
                const panel = panels[index];
                (panel as HTMLElement).style.display = 'none';
            }

            // TODO: Settingspanel should be initialized only once
            // Move to constructor?
            if (!this.settingsEl)
                throw "settings element is missing in DOM";

            const settingsPanel = new SettingsPanel(this.settingsEl, this.firebaseApp);
            settingsPanel.createAsync().then(() => settingsPanel.open());
        });

        this.dbSubtitlesRef!.orderBy("created")
            .onSnapshot(snapshot => {
                console.log(snapshot);
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        this.addSubtitleToDom(subtitle);
                    }
                    if (change.type === "modified") {
                        this.updateSubtitleInDom(subtitle);
                    }
                    if (change.type === "removed") {
                        throw 'not implemented';
                    }
                });
            });
    }

    private toggleSubtitleInFavoritesAsync(subId: string) {
        if (!this.dbFavoriteSubtitlesRef) {
            throw new Error("Can't add favorite subtitle: dbFavoriteSubtitlesRef is undefined.")
        }

        if (!this.dbSubtitlesRef) {
            throw new Error("Can't add favorite subtitle: dbSubtitlesRef is undefined.")
        }

        const sourceSubtitleRef = this.dbSubtitlesRef.doc(subId);
        sourceSubtitleRef.get().then(subDoc => {
            const { id: sourceSubtitleId, subtitle, translation, favoriteId } = Object.assign(subDoc.data(), { id: subDoc.id }) as ISubtitle;
            const fav = {
                sourceSubtitleId,
                subtitle,
                translation
            };

            const favoriteSubRef = favoriteId ? this.dbFavoriteSubtitlesRef!.doc(favoriteId) : this.dbFavoriteSubtitlesRef!.doc();
            if (favoriteId) {// Remove from favorites
                return Promise.all([
                    favoriteSubRef.delete(),
                    sourceSubtitleRef.update({ favoriteId: null })
                ]);
            }
            else {
                // Add to favorites
                return Promise.all([
                    favoriteSubRef.set(fav),
                    sourceSubtitleRef.update({ favoriteId: favoriteSubRef.id })
                ]);
            }
        });
    }

    private getSubitleTemplate(sub: ISubtitle): JQuery {
        const $template = $(`
            <div class="sub" data-subid="${sub.id}">
                <p class="original">${sub.subtitle}</p>
            </div>`);

        if (sub.translation) {
            // TODO: reduce into single append!
            $template.append(`<p class="translation">${sub.translation}</p>`);
            $template.append(`
                <div class="sub-controls">
                    <span class="fav${!sub.favoriteId ? "" : " hide"}">☆</span>
                    <span class="unfav${sub.favoriteId ? "" : " hide"}">★</span>
                </div>`);
            $template.append(`<div class="clear"></div>`);
        }

        return $template;
    }

    private addSubtitleToDom(sub: ISubtitle) {
        if (!this.$container)
            return;

        // todo: use an dictionary to keep reference of subtitles in DOM by id
        const $template = this.getSubitleTemplate(sub);
        this.$container.append($template);
        this.scrollDown();
    }

    private updateSubtitleInDom(sub: ISubtitle) {
        if (!this.$container)
            return;

        const $template = this.getSubitleTemplate(sub);

        // todo: use an dictionary to keep reference of subtitles in DOM by id
        this.$container.find(`.sub[data-subid=${sub.id}]`).replaceWith($template);

    }

    private scrollDown() {
        if (!this.$toolbar)
            return;

        $('html, body').animate({
            scrollTop: this.$toolbar.offset()!.top + 100
        }, 0);
    }
}

$(function () {
    const network = new HttpNetwork();
    const app = new RemoteSubtitleReceiver(config, new GoogleTranslate(config, network));
});
