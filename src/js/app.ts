/// <reference path="lib.ts"/>
/// <reference path="../config.ts"/>

declare var firebase: any;

namespace thdk.rst {
    export class RemoteSubtitleReceiver {
        private db: any;
        private $container?: JQuery;
        private $toolbar?: JQuery;
        private dbSubtitlesRef: any;
        private dbSessionsRef: any;

        private session?: ISession;

        private translateService: translate.ITranslateService;

        constructor(config: IAppConfig, translateService: translate.ITranslateService) {
            firebase.initializeApp({
                apiKey: config.apiKey,
                authDomain: 'czech-subs-1520975638509.firebaseapp.com',
                projectId: 'czech-subs-1520975638509'
            });

            this.translateService = translateService;

            this.initCloudFirestoreAsync()
                .then(() => {
                    this.$container = $("#subsContainer");
                    this.$toolbar = $("#toolbar");

                    this.init();
                });
        }

        private initCloudFirestoreAsync(): Promise<void> {
            // Initialize Cloud Firestore through Firebase
            this.db = firebase.firestore();
            const settings = {/* your settings... */ timestampsInSnapshots: true };
            this.db.settings(settings);

            this.dbSessionsRef = this.db.collection("sessions");

            // TODO: implement firebase auth and replace below uid with the uid of logged in user
            return this.dbSessionsRef.where("uid", "==", "RSSYXXk2sBNfmAGG0sUtfmKcOox1").orderBy("created", "desc").limit(1)
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
            if (!this.$container || !this.$toolbar)
                return;

            this.$container.on("click", ".sub", (e) => {
                const $target = $(e.currentTarget);
                const subId = $target.attr("data-subid");
                this.translateService.translate($target.find("p.original").html()).then(translation => {
                    this.dbSubtitlesRef.doc(subId).update({ translation });
                });
            });

            this.$toolbar.on("click touchstart", ".toggleplayback", (e) => {
                e.preventDefault();
                this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                    this.session!.isWatching = !this.session!.isWatching;
                });
            });

            this.dbSubtitlesRef.orderBy("created")
                .onSnapshot(snapshot => {
                    console.log(snapshot);
                    snapshot.docChanges.forEach(change => {
                        if (change.type === "added") {
                            this.addSubtitleToDom(change.doc.data(), change.doc.id);
                        }
                        if (change.type === "modified") {
                            this.updateSubtitleInDom(change.doc.data(), change.doc.id);
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

            if (sub.translation)
                $template.append(`<p class="translation">${sub.translation}</p>`);

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

        private updateSubtitleInDom(sub: ISubtitle, id: string) {
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