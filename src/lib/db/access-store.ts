import { EventEmitter } from 'events';
import Knex from 'knex';
import metricsHelper from '../metrics-helper';
import { DB_TIME } from '../events';

export default class AccessStore {
    private logger: Function;
    private timer: Function;
    private db: Knex;

    constructor(db: Knex, eventBus: EventEmitter, getLogger: Function) {
        this.db = db;
        this.logger = getLogger('access-store.js');
        this.timer = (action: string) =>
            metricsHelper.wrapTimer(eventBus, DB_TIME, {
                store: 'addons',
                action,
            });
    }

    async getPermissionsForUser(userId: Number) {
        const stopTimer = this.timer('getPermissionsForUser');
        const rows = await this.db
            .select('project', 'permission')
            .from('role_permission AS rp')
            .leftJoin('user_role AS ur', 'ur.role_id', 'rp.role_id')
            .where('user_id', '=', userId);
        stopTimer();
        return rows;
    }
}