import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"

import { GlobalLoader } from "@/components/GlobalLoader"
import { AppShell } from "@/components/layouts/AppShell"
import { PrivateRoute } from "@/components/PrivateRoute"
import { RouteLoader } from "@/components/RouteLoader"
import { TenantRoute } from "@/components/TenantRoute"
import { ChangePasswordPage } from "@/pages/ChangePasswordPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { MembershipDetailPage } from "@/pages/MembershipDetailPage"
import { MembershipFormPage } from "@/pages/MembershipFormPage"
import { MembershipsPage } from "@/pages/MembershipsPage"
import { PlanPage } from "@/pages/PlanPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { ResetPasswordPage } from "@/pages/ResetPasswordPage"
import { SelectTenantPage } from "@/pages/SelectTenantPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { TenantDetailPage } from "@/pages/TenantDetailPage"
import { TenantsPage } from "@/pages/TenantsPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { EmployeeFormPage } from "@/pages/workforce/EmployeeFormPage"
import { EmployeePage } from "@/pages/workforce/EmployeePage"
import { JourneyPage } from "@/pages/workforce/JourneyPage"
import {
  ClosingsPage,
  LaborPage,
  NotificationsPage,
  OccurrencesPage,
  OrganizationPage,
  PayrollPage,
  ReasonsPage,
  ReportsPage,
  RequestsPage,
  TimeClockPage,
} from "@/pages/workforce/OperationsPages"
import { PeoplePage } from "@/pages/workforce/PeoplePage"

function RootLayout() {
  return (
    <>
      <RouteLoader />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/verify-email/confirm", element: <VerifyEmailPage /> },
      {
        element: <PrivateRoute />,
        children: [
          { path: "/select-tenant", element: <SelectTenantPage /> },
          {
            element: <TenantRoute />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { path: "/", element: <HomePage /> },
                  { path: "/plan", element: <PlanPage /> },
                  { path: "/settings", element: <SettingsPage /> },
                  { path: "/memberships", element: <MembershipsPage /> },
                  { path: "/memberships/new", element: <MembershipFormPage /> },
                  { path: "/memberships/:id", element: <MembershipDetailPage /> },
                  { path: "/tenants", element: <TenantsPage /> },
                  { path: "/tenants/:id", element: <TenantDetailPage /> },
                  { path: "/change-password", element: <ChangePasswordPage /> },
                  { path: "/schedules", element: <JourneyPage /> },
                  { path: "/time-clock", element: <TimeClockPage /> },
                  { path: "/occurrences", element: <OccurrencesPage /> },
                  { path: "/requests", element: <RequestsPage /> },
                  { path: "/closings", element: <ClosingsPage /> },
                  { path: "/people/new", element: <EmployeeFormPage /> },
                  { path: "/people/:id", element: <EmployeePage /> },
                  { path: "/people", element: <PeoplePage /> },
                  { path: "/reports", element: <ReportsPage /> },
                  { path: "/notifications", element: <NotificationsPage /> },
                  { path: "/organization", element: <OrganizationPage /> },
                  { path: "/labor-rules", element: <LaborPage /> },
                  { path: "/payroll", element: <PayrollPage /> },
                  { path: "/reasons", element: <ReasonsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])

export function App() {
  return (
    <>
      <GlobalLoader />
      <RouterProvider router={router} />
    </>
  )
}
