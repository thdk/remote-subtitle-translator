/// <reference path="lib.ts"/>
/// <reference path="../config.ts"/>

declare var firebase: any;

namespace thdk.rst {
    export class RemoteSubtitleReceiver {
        private db: any;
        private $container: JQuery;
        private $toolbar: JQuery;
        private dbSubtitlesRef: any;
        private dbUserRef: any;

        private user?: IUser;

        private translateService: translate.ITranslateService;

        constructor(config: IAppConfig, translateService: translate.ITranslateService) {
            firebase.initializeApp({
                apiKey: config.apiKey,
                authDomain: 'czech-subs-1520975638509.firebaseapp.com',
                projectId: 'czech-subs-1520975638509'
            });

            this.translateService = translateService;

            // Initialize Cloud Firestore through Firebase
            this.db = firebase.firestore();
            const settings = {/* your settings... */ timestampsInSnapshots: true };
            this.db.settings(settings);

            this.dbSubtitlesRef = this.db.collection("subtitles");

            this.dbUserRef = this.db.collection("users").doc("thomas"); // todo use the logged in user id


            this.$container = $("#subsContainer");
            this.$toolbar = $("#toolbar");

            this.preInitAsync().then(() => this.init());
        }

        private preInitAsync() {
            return this.dbUserRef.get().then(doc => {
                if (doc.exists) {
                    this.user = { isWatching: doc.data().isWatching };
                    console.log("Document data:", doc.data());
                } else {
                    // doc.data() will be undefined in this case
                    console.log("No such document!");
                }
            }).catch(function (error) {
                console.log("Error getting document:", error);
            });
        }

        private init() {

            this.$container.on("click", ".sub", (e) => {
                const $target = $(e.currentTarget);
                const subId = $target.attr("data-subid");
                this.translateService.translate($target.find("p.original").html()).then(translation => {
                    this.dbSubtitlesRef.doc(subId).update({ translation });
                });
            });

            this.$toolbar.on("click touchstart", ".toggleplayback", (e) => {
                e.preventDefault();
                this.dbUserRef.update({ isWatching: !this.user!.isWatching }).then(() => {
                    this.user!.isWatching = !this.user!.isWatching;
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
            // todo: use an dictionary to keep reference of subtitles in DOM by id
            const $template = this.getSubitleTemplate(sub, id);
            this.$container.append($template);
            this.scrollDown();
        }

        private updateSubtitleInDom(sub: ISubtitle, id: string) {
            const $template = this.getSubitleTemplate(sub, id);

            // todo: use an dictionary to keep reference of subtitles in DOM by id
            this.$container.find(`.sub[data-subid=${id}]`).replaceWith($template);

        }

        private scrollDown() {
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