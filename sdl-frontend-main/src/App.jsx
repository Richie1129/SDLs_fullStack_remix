import React from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route } from "react-router-dom";
import { ProtectedLogin, ProtectedRoute } from "./utils/ProtectedRoute";
import { AuthProvider } from "./utils/AuthContext";
import HomePage from "./pages/home/HomePage";
import Login from "./pages/login/Login";
import Register from "./pages/login/Register";
import Kanban from "./pages/Kanban/Kanban";
import RootLayout from "./layouts/RootLayout";
import ProjectLayout from "./layouts/ProjectLayout";
import Bulletin from "./pages/bulletin/Bulletin";
import List from "./pages/list/List";
import SubmitTask from "./pages/submit/SubmitTask";
import AskQuestion from "./pages/AskQuestion/AskQuestion";
import Reflection from "./pages/reflection/Reflection";
import Protfolio from './pages/protfolio/Protfolio';
import ManageIdeaWall from "./pages/manageIdeaWall/ManageIdeaWall";
import IdeaWall from "./pages/ideaWall/IdeaWall";
import NotFound from "./pages/notFound/NotFound";
import TeacherManagementDashboard from './pages/teacher-dashboard';
import ManagementOverview from './pages/overview/ManagementOverview';
import StudentDashboard from './pages/student-dashboard';
import StudentOverview from './pages/overview/StudentOverview';
import TeacherOverview from './pages/overview/TeacherOverview';
import ClassObservationPage from './pages/observation/ClassObservationPage';
import Profile from './pages/profile/Profile';

export default function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<RootLayout />} >
        <Route element={<ProtectedLogin />}>
          <Route index element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="homepage" element={<HomePage />} />
          <Route path="bulletin" element={<Bulletin />} />
          <Route path="List" element={<List />} />
          <Route path="overView" element={<ManagementOverview />} />
          <Route path="student-overview" element={<StudentOverview />} />
          <Route path="teacher-overview" element={<TeacherOverview />} />
          <Route path="observation" element={<ClassObservationPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="project/:projectId" element={<ProjectLayout />}>
            <Route path="kanban" element={<Kanban />} />
            <Route path="submitTask" element={<SubmitTask />} />
            <Route path="askQuestion" element={<AskQuestion />} />
            <Route path="reflection" element={<Reflection />} />
            <Route path="protfolio" element={<Protfolio />} />
            <Route path="manageIdeaWall" element={<ManageIdeaWall />} />
            <Route path="ideaWall" element={<IdeaWall />} />
            <Route path="teacherDashboard" element={<TeacherManagementDashboard />} />
            <Route path="studentDashboard" element={<StudentDashboard />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />}></Route>
      </Route>

    )
  )

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

