import { throws } from 'assert';
import { AccessStore, Role, Permission } from '../db/access-store';
import {
    ADMIN,
    UPDATE_PROJECT,
    DELETE_PROJECT,
    CREATE_FEATURE,
    UPDATE_FEATURE,
    DELETE_FEATURE,
} from '../permissions';
import User from '../user';

const PROJECT_ADMIN = [
    UPDATE_PROJECT,
    DELETE_PROJECT,
    CREATE_FEATURE,
    UPDATE_FEATURE,
    DELETE_FEATURE,
];
const PROJECT_REGULAR = [CREATE_FEATURE, UPDATE_FEATURE, DELETE_FEATURE];

interface Stores {
    accessStore: AccessStore;
    userStore: any;
}

// Can replace this with a tuple?
interface RoleUsers {
    role: Role;
    users: User[];
}

interface RoleData extends RoleUsers {
    permissions: Permission[];
}

export class AccessService {
    private store: AccessStore;

    private userStore: any;

    private logger: Function;

    constructor({ accessStore, userStore }: Stores, { getLogger } : { getLogger: Function}) {
        this.store = accessStore;
        this.userStore = userStore;
        this.logger = getLogger('/services/access-service.ts');
    }

    async hasPermission(user: User, permission: string, projectName?: string): Promise<boolean> {
        const permissions = await this.store.getPermissionsForUser(user.id);
        return permissions
            .filter(p => !p.project || p.project === projectName)
            .some(p => p.permission === permission || p.permission === ADMIN);
    }

    async addUserToRole(user: User, role: Role) {
        return this.store.addUserToRole(user.id, role.id);
    }

    async removeUserFromRole(user: User, role: Role) {
        return this.store.removeUserFromRole(user.id, role.id);
    }

    async getRoles(): Promise<Role[]> {
        return this.store.getRoles();
    }

    async getRole(roleId: number): Promise<RoleData> {
        const [role, permissions, users] = await Promise.all([
            this.store.getRoleWithId(roleId),
            this.store.getPermissionsForRole(roleId),
            this.getUsersForRole(roleId),
        ]);
        return { role, permissions, users };
    }

    async getRolesForProject(projectName: string): Promise<Role[]> {
        return this.store.getRolesForProject(projectName);
    }

    async getRolesForUser(user: User): Promise<Role[]> {
        return this.store.getRolesForUserId(user.id);
    }

    async getRoleUsers(roleId) : Promise<RoleUsers> {
        const [role, users] = await Promise.all([
            this.store.getRoleWithId(roleId), 
            this.getUsersForRole(roleId)]);
        return {role, users}

    }

    private async getUsersForRole(roleId) : Promise<User[]> {
        const userIdList = await this.store.getUserIdsForRole(roleId);
        return this.userStore.getAllWithId(userIdList);
    }

    async getProjectRoleUsers(projectName: string): Promise<RoleUsers[]> {
        const roles = await this.store.getRolesForProject(projectName);
        return Promise.all(roles.map(async role => {
            const users = await this.getUsersForRole(role.id);
            return {
                role,
                users
            }
        }));
    }

    async createDefaultProjectRoles(owner: User, projectId: string) {
        if(!projectId) {
            throw new Error("ProjectId cannot be empty");
        }

        const adminRole = await this.store.createRole(
            `${projectId} Admin`,
            'project-admin', //TODO: constant
            projectId,
            `Admin role for project = ${projectId}`,
        );
        await this.store.addPermissionsToRole(
            adminRole.id,
            PROJECT_ADMIN,
            projectId,
        );

        // TODO: remove this when all users is guaranteed to have a unique id. 
        if (owner.id) {
            this.store.addUserToRole(owner.id, adminRole.id);    
        };
        

        const regularRole = await this.store.createRole(
            `${projectId} Regular`,
            'project-regular',  //TODO: constant
            projectId,
            `Contributor role for project = ${projectId}`,
        );
        await this.store.addPermissionsToRole(
            regularRole.id,
            PROJECT_REGULAR,
        );
    }
}
