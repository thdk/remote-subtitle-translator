/// <reference path="panels.ts" />

namespace thdk.rst {
    export class SettingsPanel extends Panel {
        private firebaseApp: any;
        private loggedInEls: NodeListOf<Element>;

        constructor(container: HTMLElement, firebaseApp: any) {
            super('settings', container);
            this.firebaseApp = firebaseApp;

            this.loggedInEls = this.containerEl.getElementsByClassName('logged-in');
        }

        public createAsync() {
            return new Promise<void>((resolve, reject) => {
                const user = this.firebaseApp.auth().currentUser;
                if (user) {
                    this.containerEl.getElementsByClassName('logged-in username')
                        .item(0)
                        .getElementsByTagName('span')
                        .item(0)
                        .textContent = user.displayName;

                    // display all elements for logged in users
                    for (let index = 0; index < this.loggedInEls.length; index++) {
                        (this.loggedInEls[index] as HTMLElement).style.display = 'block';
                    }

                    resolve();
                }
                else {
                    reject();
                }
            });
        }

        protected init() {
            super.init();
            const logoutButton = this.containerEl.querySelector("#settingsLogoutButton");
            if (logoutButton) {
                logoutButton.addEventListener("click", e => {
                    this.firebaseApp.auth().signOut();
                });
            }
        }

        public open() {
            this.init();
            super.open();
        }
    }
}