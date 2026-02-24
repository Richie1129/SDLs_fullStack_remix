//controllers for project
//
// This file has been refactored into a modular structure.
// All implementations are now organized in the ./project/ directory:
//
// ./project/
// ├── projectController.js          - Basic CRUD operations (6 functions)
// ├── projectMemberController.js    - Member management (3 functions)
// ├── projectViewingController.js   - Viewing permission management (6 functions)
// └── index.js                      - Unified exports
//
// Total: 15 functions, maintaining 100% backward compatibility with existing routes.

module.exports = require('./project/index');
