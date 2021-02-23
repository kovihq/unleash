import { AccessStore, Role } from '../db/access-store';
import { ADMIN, UPDATE_PROJECT, DELETE_PROJECT, CREATE_FEATURE, UPDATE_FEATURE, DELETE_FEATURE  } from '../permissions';
import User from '../user';

const PROJECT_ADMIN_permissions = [
    UPDATE_PROJECT, DELETE_PROJECT, CREATE_FEATURE, UPDATE_FEATURE, DELETE_FEATURE
];
const PROJECT_REGULAR_permissions = [
    CREATE_FEATURE, UPDATE_FEATURE, DELETE_FEATURE
];

interface Stores {
    accessStore: AccessStore
}

export class AccessService {
    private store: AccessStore;
    private logger: Function;

    constructor({ accessStore } : Stores, { getLogger }) {
        this.store = accessStore;
        this.logger = getLogger('/services/access-service.ts');
    }

    async hasPermission(user: User, permission: string, projectName?: string) {
        const permissions = await this.store.getPermissionsForUser(user.id);
        return permissions
            .filter(p => (!p.project || p.project === projectName))
            .some(p => (p.permission === permission || p.permission === ADMIN));
    }

    async addUserToRole(user: User, role: Role) {
        return this.store.addUserToRole(user.id, role.id);
    }

    async getProjectRoles(projectName: string) : Promise<Role[]> {
        return this.store.getRolesForProject(projectName);
    }

    async createDefaultProjectRoles(owner: User, projectName: string) {
        const adminRole = await this.store.createRole(`${projectName} Admin`, 'project', projectName, `Admin role for project = ${projectName}`);
        await this.store.addPermissionsToRole(adminRole.id, PROJECT_ADMIN_permissions);
        this.store.addUserToRole(owner.id, adminRole.id);

        const regularRole = await this.store.createRole(`${projectName} Regular`, 'project', projectName, `Contributor role for project = ${projectName}`);
        await this.store.addPermissionsToRole(regularRole.id, PROJECT_REGULAR_permissions);
    }
}
