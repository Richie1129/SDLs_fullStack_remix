//controllers/project/index.js - Unified exports for project controller
//
// This file aggregates all project-related controllers and re-exports them
// to maintain backward compatibility with existing routes.
//
// The original monolithic project.js has been refactored into:
// - projectController.js (Basic CRUD operations)
// - projectMemberController.js (Member management)
// - projectViewingController.js (Viewing permission management)

const projectController = require('./projectController');
const projectMemberController = require('./projectMemberController');
const projectViewingController = require('./projectViewingController');

// Re-export all functions to maintain the same interface
module.exports = {
    // Basic CRUD operations (6 functions from projectController.js)
    getProject: projectController.getProject,
    getAllProject: projectController.getAllProject,
    getProjectsByMentor: projectController.getProjectsByMentor,
    createProject: projectController.createProject,
    updateProject: projectController.updateProject,
    deleteProject: projectController.deleteProject,

    // Member management (3 functions from projectMemberController.js)
    inviteForProject: projectMemberController.inviteForProject,
    assignStudentsToGroup: projectMemberController.assignStudentsToGroup,
    getAllStudents: projectMemberController.getAllStudents,

    // Viewing permission management (6 functions from projectViewingController.js)
    updateViewingSettings: projectViewingController.updateViewingSettings,
    checkViewingPermission: projectViewingController.checkViewingPermission,
    getViewableProjects: projectViewingController.getViewableProjects,
    getAllClasses: projectViewingController.getAllClasses,
    getClassUsersAndProjects: projectViewingController.getClassUsersAndProjects,
    batchUpdateViewingSettings: projectViewingController.batchUpdateViewingSettings
};
