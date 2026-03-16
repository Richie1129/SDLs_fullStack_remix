import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route } from "react-router-dom";
import { ProtectedLogin, ProtectedRoute } from "./utils/ProtectedRoute";
import { AuthProvider } from "./utils/AuthContext";
import RootLayout from "./layouts/RootLayout";

const HomePage = lazy(() => import("./pages/home/HomePage"));
const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/login/Register"));
const ForgotPassword = lazy(() => import("./pages/login/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/login/ResetPassword"));
const Kanban = lazy(() => import("./pages/Kanban/Kanban"));
const Bulletin = lazy(() => import("./pages/bulletin/Bulletin"));
const List = lazy(() => import("./pages/list/List"));
const SubmitTask = lazy(() => import("./pages/submit/SubmitTask"));
const AskQuestion = lazy(() => import("./pages/AskQuestion/AskQuestion"));
const Reflection = lazy(() => import("./pages/reflection/Reflection"));
const Protfolio = lazy(() => import('./pages/protfolio/Protfolio'));
const ManageIdeaWall = lazy(() => import("./pages/manageIdeaWall/ManageIdeaWall"));
const IdeaWall = lazy(() => import("./pages/ideaWall/IdeaWall"));
const ExportPreview = lazy(() => import("./pages/ExportPreview"));
const StudentPortfolio = lazy(() => import('./pages/StudentPortfolio'));
const NotFound = lazy(() => import("./pages/notFound/NotFound"));
const TeacherManagementDashboard = lazy(() => import('./pages/teacher-dashboard'));
const ManagementOverview = lazy(() => import('./pages/overview/ManagementOverview'));
const StudentDashboard = lazy(() => import('./pages/student-dashboard'));
const StudentOverview = lazy(() => import('./pages/overview/StudentOverview'));
const TeacherOverview = lazy(() => import('./pages/overview/TeacherOverview'));
const ClassObservationPage = lazy(() => import('./pages/observation/ClassObservationPage'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const TeacherPasswordReset = lazy(() => import('./pages/teacher-password-reset'));
const StreamdownDemo = lazy(() => import('./pages/StreamdownDemo'));
const TestRag = lazy(() => import('./pages/TestRag'));
const TrackingTestPage = lazy(() => import('./test/TrackingTestPage'));
const ProjectLayout = lazy(() => import("./layouts/ProjectLayout"));

const RouteFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#5BA491]" />
  </div>
);

export default function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<RootLayout />} >
        <Route element={<ProtectedLogin />}>
          <Route index element={<Login />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="homepage" element={<HomePage />} />
          <Route path="test-rag" element={<TestRag />} />
          <Route path="test-tracking" element={<TrackingTestPage />} />
          <Route path="bulletin" element={<Bulletin />} />
          <Route path="List" element={<List />} />
          <Route path="overView" element={<ManagementOverview />} />
          <Route path="student-overview" element={<StudentOverview />} />
          <Route path="teacher-overview" element={<TeacherOverview />} />
          <Route path="observation" element={<ClassObservationPage />} />
          <Route path="teacher-password-reset" element={<TeacherPasswordReset />} />
          <Route path="profile" element={<Profile />} />
          <Route path="streamdown-demo" element={<StreamdownDemo />} />
          <Route path="project/:projectId" element={<ProjectLayout />}>
            <Route path="kanban" element={<Kanban />} />
            <Route path="submitTask" element={<SubmitTask />} />
            <Route path="askQuestion" element={<AskQuestion />} />
            <Route path="reflection" element={<Reflection />} />
            <Route path="protfolio" element={<Protfolio />} />
            <Route path="export-preview" element={<ExportPreview />} />
            <Route path="student-portfolio" element={<StudentPortfolio />} />
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
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
    </AuthProvider>
  )
}
