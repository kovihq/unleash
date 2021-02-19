exports.up = function(db, cb) {
    db.runSql(
        `CREATE TABLE IF NOT EXISTS roles
       (
          id          SERIAL PRIMARY KEY,
          name        text not null,
          description text,
          type        text not null default 'custom',
          created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
       );
      CREATE TABLE IF NOT EXISTS role_user
      (
          role_id     integer not null references roles (id) ON DELETE CASCADE,
          user_id     integer not null references users (id) ON DELETE CASCADE,
          created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
          PRIMARY KEY (role_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS role_permission
      (
          role_id     integer not null references roles (id) ON DELETE CASCADE,
          project     text,
          permission  text not null,
          created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    
      WITH admin AS (
        INSERT INTO roles(name, description, type)
        VALUES ('Super User', 'Admin the Unleash Instance', 'root')
        RETURNING id user_id
      )

      INSERT INTO role_permission(role_id, permission) 
      SELECT user_id, 'ADMIN' from admin;

      WITH regular AS (
        INSERT INTO roles(name, description, type)
        VALUES ('Regular', 'Regular contributor. Can modify all root resources.', 'root')
        RETURNING id user_id
      )

      INSERT INTO role_permission(role_id, permission)
      VALUES
        ((SELECT user_id from regular), 'CREATE_ADDON'),
        ((SELECT user_id from regular), 'UPDATE_ADDON');
      
      INSERT INTO roles(name, description, type)
      VALUES ('Read', 'A Read only user.', 'root');
      `,
        cb,
    );
};

exports.down = function(db, cb) {
    db.runSql(
        `
      DROP TABLE role_user;
      DROP TABLE role_permission;
      DROP TABLE roles;
      `,
        cb,
    );
};
