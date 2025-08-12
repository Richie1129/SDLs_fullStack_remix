'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) users
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      username: { type: Sequelize.TEXT, allowNull: false },
      account: { type: Sequelize.TEXT, allowNull: false },
      password: { type: Sequelize.TEXT, allowNull: false },
      role: { type: Sequelize.TEXT, allowNull: false },
      class: { type: Sequelize.TEXT, allowNull: true },
      seatNumber: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2) projects
    await queryInterface.createTable('projects', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      describe: { type: Sequelize.TEXT, allowNull: false },
      mentor: { type: Sequelize.TEXT, allowNull: false },
      referral_code: { type: Sequelize.TEXT, allowNull: true },
      currentStage: { type: Sequelize.INTEGER, allowNull: true },
      currentSubStage: { type: Sequelize.INTEGER, allowNull: true },
      ProjectEnd: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      is_open_for_viewing: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      allowed_classes: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 3) user_projects (join)
    await queryInterface.createTable('user_projects', {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 4) announcements
    await queryInterface.createTable('announcements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      author: { type: Sequelize.STRING, allowNull: false },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 5) idea_walls
    await queryInterface.createTable('idea_walls', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: true },
      type: { type: Sequelize.TEXT, allowNull: false },
      stage: { type: Sequelize.TEXT, allowNull: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 6) processes
    await queryInterface.createTable('processes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      stage: { type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: false },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 7) stages
    await queryInterface.createTable('stages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      sub_stage: { type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: false },
      processId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'processes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 8) sub_stages
    await queryInterface.createTable('sub_stages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      userSubmit: { type: Sequelize.JSON, allowNull: false },
      stageId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'stages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 9) kanbans
    await queryInterface.createTable('kanbans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      column: { type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 10) columns
    await queryInterface.createTable('columns', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      task: { type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: true },
      kanbanId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'kanbans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 11) tags
    await queryInterface.createTable('tags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      bg_color: { type: Sequelize.TEXT, allowNull: false },
      text_color: { type: Sequelize.TEXT, allowNull: false },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 12) tasks
    await queryInterface.createTable('tasks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      labels: { type: Sequelize.ARRAY(Sequelize.JSONB), allowNull: true },
      owner: { type: Sequelize.TEXT, allowNull: true },
      assignees: { type: Sequelize.ARRAY(Sequelize.JSONB), allowNull: true },
      image: { type: Sequelize.BLOB, allowNull: true },
      images: { type: Sequelize.ARRAY(Sequelize.TEXT), allowNull: true, defaultValue: [] },
      files: { type: Sequelize.ARRAY(Sequelize.JSONB), allowNull: true, defaultValue: [] },
      columnId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'columns', key: 'id' },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 13) card_tags (join for tasks<->tags)
    await queryInterface.createTable('card_tags', {
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addConstraint('card_tags', {
      fields: ['taskId', 'tagId'],
      type: 'primary key',
      name: 'pk_card_tags'
    });

    // 14) node
    await queryInterface.createTable('nodes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: true },
      owner: { type: Sequelize.TEXT, allowNull: false },
      colorindex: { type: Sequelize.INTEGER, allowNull: true },
      ideaWallId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'idea_walls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 15) node_relations
    await queryInterface.createTable('node_relations', {
      from_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'nodes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      to_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'nodes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 16) node_change_logs
    await queryInterface.createTable('node_change_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nodeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'nodes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      changeType: { type: Sequelize.ENUM('create', 'update', 'delete'), allowNull: false },
      fieldName: { type: Sequelize.STRING, allowNull: true },
      oldValue: { type: Sequelize.TEXT, allowNull: true },
      newValue: { type: Sequelize.TEXT, allowNull: true },
      changedBy: { type: Sequelize.STRING, allowNull: false },
      projectId: { type: Sequelize.INTEGER, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 17) daily_personals
    await queryInterface.createTable('daily_personals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      fileData: { type: Sequelize.BLOB, allowNull: true },
      filename: { type: Sequelize.TEXT, allowNull: true },
      fileName: { type: Sequelize.TEXT, allowNull: true },
      originalName: { type: Sequelize.TEXT, allowNull: true },
      fileUrl: { type: Sequelize.TEXT, allowNull: true },
      mimeType: { type: Sequelize.STRING(100), allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 18) daily_teams
    await queryInterface.createTable('daily_teams', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      fileData: { type: Sequelize.BLOB, allowNull: true },
      filename: { type: Sequelize.TEXT, allowNull: true },
      creator: { type: Sequelize.TEXT, allowNull: false },
      fileName: { type: Sequelize.TEXT, allowNull: true },
      originalName: { type: Sequelize.TEXT, allowNull: true },
      fileUrl: { type: Sequelize.TEXT, allowNull: true },
      mimeType: { type: Sequelize.STRING(100), allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 19) submits
    await queryInterface.createTable('submits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      stage: { type: Sequelize.TEXT, allowNull: false },
      content: { type: Sequelize.JSON, allowNull: false },
      fileData: { type: Sequelize.BLOB, allowNull: true },
      fileName: { type: Sequelize.TEXT, allowNull: true },
      originalName: { type: Sequelize.TEXT, allowNull: true },
      fileUrl: { type: Sequelize.TEXT, allowNull: true },
      mimeType: { type: Sequelize.STRING(100), allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 20) submit_change_logs
    await queryInterface.createTable('submit_change_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      submitId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'submits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      changeType: { type: Sequelize.ENUM('create', 'update', 'delete'), allowNull: false },
      fieldName: { type: Sequelize.STRING, allowNull: true },
      oldValue: { type: Sequelize.TEXT, allowNull: true },
      newValue: { type: Sequelize.TEXT, allowNull: true },
      changedBy: { type: Sequelize.STRING, allowNull: false },
      projectId: { type: Sequelize.INTEGER, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 21) task_change_logs
    await queryInterface.createTable('task_change_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      changeType: { type: Sequelize.ENUM('create', 'update', 'move', 'delete'), allowNull: false },
      fieldName: { type: Sequelize.STRING, allowNull: true },
      oldValue: { type: Sequelize.TEXT, allowNull: true },
      newValue: { type: Sequelize.TEXT, allowNull: true },
      changedBy: { type: Sequelize.STRING, allowNull: false },
      projectId: { type: Sequelize.INTEGER, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 22) chatroom_messages
    await queryInterface.createTable('chatroom_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      author: { type: Sequelize.TEXT, allowNull: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 23) questions
    await queryInterface.createTable('questions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: false },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 24) question_messages
    await queryInterface.createTable('question_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      author: { type: Sequelize.STRING, allowNull: false },
      questionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 25) threads
    await queryInterface.createTable('threads', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      title: { type: Sequelize.TEXT, allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 26) messages (threads_message)
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      messageText: { type: Sequelize.TEXT, allowNull: false },
      threadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'threads', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 27) rag_messages
    await queryInterface.createTable('rag_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      input_message: { type: Sequelize.TEXT, allowNull: true },
      response_message: { type: Sequelize.TEXT, allowNull: true },
      author: { type: Sequelize.TEXT, allowNull: true },
      userName: { type: Sequelize.TEXT, allowNull: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionId: { type: Sequelize.STRING, allowNull: true },
      ragflow_session_id: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rag_messages');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('threads');
    await queryInterface.dropTable('question_messages');
    await queryInterface.dropTable('questions');
    await queryInterface.dropTable('chatroom_messages');
    await queryInterface.dropTable('task_change_logs');
    await queryInterface.dropTable('submit_change_logs');
    await queryInterface.dropTable('submits');
    await queryInterface.dropTable('daily_teams');
    await queryInterface.dropTable('daily_personals');
    await queryInterface.dropTable('node_change_logs');
    await queryInterface.dropTable('node_relations');
    await queryInterface.dropTable('nodes');
    await queryInterface.dropTable('card_tags');
    await queryInterface.dropTable('tasks');
    await queryInterface.dropTable('tags');
    await queryInterface.dropTable('columns');
    await queryInterface.dropTable('kanbans');
    await queryInterface.dropTable('sub_stages');
    await queryInterface.dropTable('stages');
    await queryInterface.dropTable('processes');
    await queryInterface.dropTable('idea_walls');
    await queryInterface.dropTable('announcements');
    await queryInterface.dropTable('user_projects');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('users');
  }
};
