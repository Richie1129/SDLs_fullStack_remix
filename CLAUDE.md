# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack educational project management system built with a Node.js/Express backend and React frontend. The system supports collaborative learning through kanban boards, idea walls, reflection tools, and real-time chat functionality.

## Development Commands

### Backend (sdl-backend-main)
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (not configured)

### Frontend (sdl-frontend-main)
- `npm run dev` - Start Vite development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Docker Development
- `docker-compose up` - Start full stack with PostgreSQL and nginx
- `docker-compose down` - Stop all services
- The docker setup includes nginx reverse proxy, certbot for SSL, and pgAdmin

## Architecture

### Backend Structure
- **Express.js server** with Socket.io for real-time communication
- **PostgreSQL database** using Sequelize ORM with auto-sync (`alter: true`)
- **MVC pattern**: models/, controllers/, routes/ directories
- **Real-time features**: Socket.io handles kanban updates, chat messages, node creation
- **File uploads**: Multer middleware for handling file uploads to `/daily_file`
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Proxy endpoints**: Custom RAG API proxy for external AI services

### Frontend Structure
- **React 18** with React Router DOM for navigation
- **Vite** as build tool and dev server
- **State management**: React Context (AuthContext, ContextProvider) + React Query
- **UI libraries**: Tailwind CSS, Framer Motion, React Beautiful DND, Lottie animations
- **Real-time**: Socket.io client for live updates
- **Routing**: Protected routes with nested project-specific routes

### Database Models
Key entities: User, Project, Kanban, Column, Task, Node, Idea_wall, Daily_personal, Daily_team, Chatroom_message, Rag_message, Question_message, Announcement

### Socket.io Events
Real-time events include: task creation/updates/deletion, kanban column management, node operations, chat messages, RAG interactions, announcements

## Key Integration Points

1. **Project-based workspace**: Routes are nested under `/project/:projectId` for project-specific features
2. **Real-time sync**: All major operations emit Socket.io events to keep clients synchronized
3. **File handling**: Static file serving for uploads with proper CORS configuration
4. **External API**: RAG proxy endpoints for AI chat functionality with custom SSL handling
5. **Authentication flow**: JWT tokens with protected routes and context-based state management

## Environment Configuration

Backend requires PostgreSQL connection via environment variables:
- `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DB`
- Server runs on port 3000
- Socket.io configured for production domain `science.lazyinwork.com`

## Development Notes

- Database syncs automatically on startup with `alter: true`
- Socket.io uses room-based communication for project isolation
- File uploads stored in `/daily_file` directory
- CORS configured for production domain
- Frontend uses React Query for server state management
- Protected routes handle authentication state