
// simple helper for making private class members
export default
class Privates {
    constructor() {

        // hooray for WeakMap
        const privatesMap = new WeakMap();

        return ( obj ) => {
            let privateMembers = privatesMap.get( obj )

            if ( ! privateMembers ) {
                privatesMap.set( obj, privateMembers = {} )
            }

            return privateMembers
        }

    }
}
