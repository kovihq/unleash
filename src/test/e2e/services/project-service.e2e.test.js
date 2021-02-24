const test = require('ava');
const dbInit = require('../helpers/database-init');
const getLogger = require('../../fixtures/no-logger');
const ProjectService = require('../../../lib/services/project-service');
const { AccessService } = require('../../../lib/services/access-service');
const User = require('../../../lib/user');
const { UPDATE_PROJECT } = require('../../../lib/permissions');

let stores;
// let projectStore;
let projectService;
let accessService;
let user;

test.before(async () => {
    const db = await dbInit('project_service_serial', getLogger);
    stores = db.stores;
    user = await stores.userStore.insert(
        new User({ name: 'Some Name', email: 'test@getunleash.io' }),
    );
    // projectStore = stores.projectStore;
    accessService = new AccessService(stores, { getLogger });
    projectService = new ProjectService(stores, { getLogger }, accessService);
});

test.after(async () => {
    await stores.db.destroy();
});

test.serial('should have default project', async t => {
    const project = await projectService.getProject('default');
    t.assert(project);
    t.is(project.id, 'default');
});

test.serial('should list all projects', async t => {
    const project = {
        id: 'test-list',
        name: 'New project',
        description: 'Blah',
    };

    await projectService.createProject(project, user);
    const projects = await projectService.getProjects();
    t.is(projects.length, 2);
});

test.serial('should create new project', async t => {
    const project = {
        id: 'test',
        name: 'New project',
        description: 'Blah',
    };

    await projectService.createProject(project, user);
    const ret = await projectService.getProject('test');
    t.deepEqual(project.id, ret.id);
    t.deepEqual(project.name, ret.name);
    t.deepEqual(project.description, ret.description);
    t.truthy(ret.createdAt);
});

test.serial('should delete project', async t => {
    const project = {
        id: 'test-delete',
        name: 'New project',
        description: 'Blah',
    };

    await projectService.createProject(project, user);
    await projectService.deleteProject(project.id, user);

    try {
        await projectService.getProject(project.id);
    } catch (err) {
        t.is(err.message, 'No project found');
    }
});

test.serial('should not be able to delete project with toggles', async t => {
    const project = {
        id: 'test-delete-with-toggles',
        name: 'New project',
        description: 'Blah',
    };
    await projectService.createProject(project, user);
    await stores.featureToggleStore.createFeature({
        name: 'test-project-delete',
        project: project.id,
        enabled: false,
    });

    try {
        await projectService.deleteProject(project.id, user);
    } catch (err) {
        t.is(
            err.message,
            'You can not delete as project with active feature toggles',
        );
    }
});

test.serial('should not delete "default" project', async t => {
    try {
        await projectService.deleteProject('default', user);
    } catch (err) {
        t.is(err.message, 'You can not delete the default project!');
    }
});

test.serial('should validate name, legal', async t => {
    const result = await projectService.validateId('new_name');
    t.true(result);
});

test.serial('should not be able to create exiting project', async t => {
    const project = {
        id: 'test-delete',
        name: 'New project',
        description: 'Blah',
    };
    try {
        await projectService.createProject(project, user);
        await projectService.createProject(project, user);
    } catch (err) {
        t.is(err.message, 'A project with this id already exists.');
    }
});

test.serial('should require URL friendly ID', async t => {
    try {
        await projectService.validateId('new name øæå');
    } catch (err) {
        t.is(err.message, '"value" must be URL friendly');
    }
});

test.serial('should require unique ID', async t => {
    try {
        await projectService.validateId('default');
    } catch (err) {
        t.is(err.message, 'A project with this id already exists.');
    }
});

test.serial('should update project', async t => {
    const project = {
        id: 'test-update',
        name: 'New project',
        description: 'Blah',
    };

    const updatedProject = {
        id: 'test-update',
        name: 'New name',
        description: 'Blah longer desc',
    };

    await projectService.createProject(project, user);
    await projectService.updateProject(updatedProject, user);

    const readProject = await projectService.getProject(project.id);

    t.is(updatedProject.name, readProject.name);
    t.is(updatedProject.description, readProject.description);
});

test.serial('should give error when getting unknown project', async t => {
    try {
        await projectService.getProject('unknown');
    } catch (err) {
        t.is(err.message, 'No project found');
    }
});

test.serial(
    '(TODO: v4): should create roles for new project if userId is missing',
    async t => {
        const project = {
            id: 'test-roles-no-id',
            name: 'New project',
            description: 'Blah',
        };
        await projectService.createProject(project, {
            username: 'random-user',
        });
        const roles = await stores.accessStore.getRolesForProject(project.id);

        t.is(roles.length, 2);
        t.false(
            await accessService.hasPermission(user, UPDATE_PROJECT, project.id),
        );
    },
);

test.serial('should create roles when project is created', async t => {
    const project = {
        id: 'test-roles',
        name: 'New project',
        description: 'Blah',
    };
    await projectService.createProject(project, user);
    const roles = await stores.accessStore.getRolesForProject(project.id);
    t.is(roles.length, 2);
    t.true(await accessService.hasPermission(user, UPDATE_PROJECT, project.id));
});
