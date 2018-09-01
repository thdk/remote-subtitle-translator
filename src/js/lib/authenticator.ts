declare const firebase: any;

export function getLoggedInUserAsync() {
    return new Promise<any>((resolve, reject) => {
        return firebase.auth().onAuthStateChanged(user => resolve(user));
    });
}