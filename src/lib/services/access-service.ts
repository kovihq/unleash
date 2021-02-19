import AccessStore from '../db/access-store';

interface Stores {
    accessStore: AccessStore
}

class AccessService {
    private store: AccessStore;
    private logger: Function;

    constructor({ accessStore } : Stores, { getLogger }) {
        this.store = accessStore;
        this.logger = getLogger('/services/access-service.ts');
    }

    hasPermission(user, permission) {
        
    }

}