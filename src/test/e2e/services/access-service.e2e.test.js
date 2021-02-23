const test = require('ava');
const dbInit = require('../helpers/database-init');
const getLogger = require('../../fixtures/no-logger');

// eslint-disable-next-line import/no-unresolved
const { AccessService } = require('../../../lib/services/access-service');
const permissions = require('../../../lib/permissions');
const User = require('../../../lib/user');
const ProjectService = require('../../../lib/services/project-service');

let stores;
// let projectStore;
let accessService;

let regularUser;
let superUser;

const createUserWithRegularAccess = async (name, email) => {
    const { userStore, accessStore } = stores;
    const user = await userStore.insert(new User({ name, email }));
    const roles = await accessStore.getRoles();
    const regularRole = roles.find(r => r.name === 'Regular');
    await accessStore.addUserToRole(user.id, regularRole.id);
    return user;
};

const createSuperUser = async () => {
    const { userStore, accessStore } = stores;
    const user = await userStore.insert(
        new User({ name: 'Alice Admin', email: 'admin@getunleash.io' }),
    );
    const roles = await accessStore.getRoles();
    const superRole = roles.find(r => r.name === 'Super User');
    await accessStore.addUserToRole(user.id, superRole.id);
    return user;
};

test.before(async () => {
    const db = await dbInit('access_service_serial', getLogger);
    stores = db.stores;
    // projectStore = stores.projectStore;
    accessService = new AccessService(stores, { getLogger });
    regularUser = await createUserWithRegularAccess(
        'Bob Test',
        'bob@getunleash.io',
    );
    superUser = await createSuperUser();
});

test.after(async () => {
    await stores.db.destroy();
});

test.serial('should have access to admin addons', async t => {
    const { CREATE_ADDON, UPDATE_ADDON, DELETE_ADDON } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, CREATE_ADDON));
    t.true(await accessService.hasPermission(user, UPDATE_ADDON));
    t.true(await accessService.hasPermission(user, DELETE_ADDON));
});

test.serial('should have access to admin strategies', async t => {
    const { CREATE_STRATEGY, UPDATE_STRATEGY, DELETE_STRATEGY } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, CREATE_STRATEGY));
    t.true(await accessService.hasPermission(user, UPDATE_STRATEGY));
    t.true(await accessService.hasPermission(user, DELETE_STRATEGY));
});

test.serial('should have access to admin contexts', async t => {
    const {
        CREATE_CONTEXT_FIELD,
        UPDATE_CONTEXT_FIELD,
        DELETE_CONTEXT_FIELD,
    } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, CREATE_CONTEXT_FIELD));
    t.true(await accessService.hasPermission(user, UPDATE_CONTEXT_FIELD));
    t.true(await accessService.hasPermission(user, DELETE_CONTEXT_FIELD));
});

test.serial('should have access to create projects', async t => {
    const { CREATE_PROJECT } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, CREATE_PROJECT));
});

test.serial('should have access to update applications', async t => {
    const { UPDATE_APPLICATION } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, UPDATE_APPLICATION));
});

test.serial(
    'should not have access to delete/update projects without specifying project',
    async t => {
        const { DELETE_PROJECT, UPDATE_PROJECT } = permissions;
        const user = regularUser;
        t.false(await accessService.hasPermission(user, DELETE_PROJECT));
        t.false(await accessService.hasPermission(user, UPDATE_PROJECT));
    },
);

test.serial('should not have admin permission', async t => {
    const { ADMIN } = permissions;
    const user = regularUser;
    t.false(await accessService.hasPermission(user, ADMIN));
});

test.serial('should have project admin to default project', async t => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const user = regularUser;
    t.true(await accessService.hasPermission(user, DELETE_PROJECT, 'default'));
    t.true(await accessService.hasPermission(user, UPDATE_PROJECT, 'default'));
    t.true(await accessService.hasPermission(user, CREATE_FEATURE, 'default'));
    t.true(await accessService.hasPermission(user, UPDATE_FEATURE, 'default'));
    t.true(await accessService.hasPermission(user, DELETE_FEATURE, 'default'));
});

test.serial('admin should be admin', async t => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
        ADMIN,
    } = permissions;
    const user = superUser;
    t.true(await accessService.hasPermission(user, DELETE_PROJECT, 'default'));
    t.true(await accessService.hasPermission(user, UPDATE_PROJECT, 'default'));
    t.true(await accessService.hasPermission(user, CREATE_FEATURE, 'default'));
    t.true(await accessService.hasPermission(user, UPDATE_FEATURE, 'default'));
    t.true(await accessService.hasPermission(user, DELETE_FEATURE, 'default'));
    t.true(await accessService.hasPermission(user, ADMIN));
});

test.serial('should create default roles to project', async t => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const project = 'some-project';
    const user = regularUser;
    await accessService.createDefaultProjectRoles(user, project);
    t.true(await accessService.hasPermission(user, UPDATE_PROJECT, project));
    t.true(await accessService.hasPermission(user, DELETE_PROJECT, project));
    t.true(await accessService.hasPermission(user, CREATE_FEATURE, project));
    t.true(await accessService.hasPermission(user, UPDATE_FEATURE, project));
    t.true(await accessService.hasPermission(user, DELETE_FEATURE, project));
});

test.serial('should grant user access to project', async t => {
    const {
        DELETE_PROJECT,
        UPDATE_PROJECT,
        CREATE_FEATURE,
        UPDATE_FEATURE,
        DELETE_FEATURE,
    } = permissions;
    const project = 'another-project';
    const user = regularUser;
    const sUser = await createUserWithRegularAccess(
        'Some Random',
        'random@getunleash.io',
    );
    await accessService.createDefaultProjectRoles(user, project);

    const roles = await accessService.getProjectRoles(project);

    const regularRole = roles.find(r => r.name === `${project} Regular`);
    await accessService.addUserToRole(sUser, regularRole);

    // Should be able to update feature toggles inside the project
    t.true(await accessService.hasPermission(sUser, CREATE_FEATURE, project));
    t.true(await accessService.hasPermission(sUser, UPDATE_FEATURE, project));
    t.true(await accessService.hasPermission(sUser, DELETE_FEATURE, project));

    // Should not be able to admin the project itself.
    t.false(await accessService.hasPermission(sUser, UPDATE_PROJECT, project));
    t.false(await accessService.hasPermission(sUser, DELETE_PROJECT, project));
});
