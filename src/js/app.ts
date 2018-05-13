/// <reference path="lib.ts"/>
/// <reference path="../config.ts"/>

declare var firebase: any;

namespace thdk.rst {
    export class RemoteSubtitleReceiver {
        private db: any;
        private $container: JQuery;
        private dbSubtitleRef: any;

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

            this.dbSubtitleRef = this.db.collection("subtitles");

            this.$container = $("#subsContainer");
        }

        public init() {

            this.$container.on("click", ".sub", (e) => {
                const $target = $(e.currentTarget);
                const subId = $target.attr("data-subid");
                this.translateService.translate($target.find("p.original").html()).then(translation => {
                    this.dbSubtitleRef.doc(subId).update({translation});
                });
            });

            this.dbSubtitleRef
                .onSnapshot(snapshot => {
                    snapshot.docChanges.forEach(change => {
                        if (change.type === "added") {
                            this.addSubtitleToDom(change.doc.data(), change.doc.id);
                        }
                        if (change.type === "modified") {
                            this.updateSubtitleInDom(change.doc.data(), change.doc.id);
                        }
                        if (change.type === "removed") {
                            console.log("Removed: ", change.doc.data());
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

            // scroll to the bottom
            this.$container[0].scrollTop = this.$container[0].scrollHeight;
        }

        private updateSubtitleInDom(sub: ISubtitle, id: string) {
            const $template = this.getSubitleTemplate(sub, id);

            // todo: use an dictionary to keep reference of subtitles in DOM by id
            this.$container.find(`.sub[data-subid=${id}]`).replaceWith($template);
        }

        private deleteSubtitleFromDom() {

        }

    }
}

$(function () {
    const network = new thdk.network.HttpNetwork();
    const app = new thdk.rst.RemoteSubtitleReceiver(config, new thdk.translate.google.GoogleTranslate(config, network));
    app.init();
});