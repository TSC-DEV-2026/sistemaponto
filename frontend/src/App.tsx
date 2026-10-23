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
import { HourBankEntryPage, JourneyPage, PunchAdjustPage } from "@/pages/workforce/JourneyPage"
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
import { EntityRecordPage } from "@/pages/workforce/EntityScreens"
import { PeoplePage } from "@/pages/workforce/PeoplePage"
import { RequestFormPage } from "@/pages/workforce/RequestFormPage"

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
                  { path: "/schedules/journeys/new", element: <EntityRecordPage catalog="journeys" mode="new" /> },
                  { path: "/schedules/journeys/:id/edit", element: <EntityRecordPage catalog="journeys" mode="edit" /> },
                  { path: "/schedules/journeys/:id", element: <EntityRecordPage catalog="journeys" mode="view" /> },
                  { path: "/schedules/adjustments", element: <PunchAdjustPage /> },
                  { path: "/schedules/hour-bank/new", element: <HourBankEntryPage /> },
                  { path: "/schedules", element: <JourneyPage /> },
                  { path: "/time-clock", element: <TimeClockPage /> },
                  { path: "/occurrences", element: <OccurrencesPage /> },
                  { path: "/requests", element: <RequestsPage /> },
                  { path: "/requests/new", element: <RequestFormPage /> },
                  { path: "/closings", element: <ClosingsPage /> },
                  { path: "/people/new", element: <EmployeeFormPage /> },
                  { path: "/people/:id/edit", element: <EmployeeFormPage /> },
                  { path: "/people/jobs/new", element: <EntityRecordPage catalog="jobs" mode="new" /> },
                  { path: "/people/jobs/:id/edit", element: <EntityRecordPage catalog="jobs" mode="edit" /> },
                  { path: "/people/jobs/:id", element: <EntityRecordPage catalog="jobs" mode="view" /> },
                  { path: "/people/cost-centers/new", element: <EntityRecordPage catalog="cost-centers" mode="new" /> },
                  { path: "/people/cost-centers/:id/edit", element: <EntityRecordPage catalog="cost-centers" mode="edit" /> },
                  { path: "/people/cost-centers/:id", element: <EntityRecordPage catalog="cost-centers" mode="view" /> },
                  { path: "/people/:id", element: <EmployeePage /> },
                  { path: "/people", element: <PeoplePage /> },
                  { path: "/organization/units/new", element: <EntityRecordPage catalog="units" mode="new" /> },
                  { path: "/organization/units/:id/edit", element: <EntityRecordPage catalog="units" mode="edit" /> },
                  { path: "/organization/units/:id", element: <EntityRecordPage catalog="units" mode="view" /> },
                  { path: "/organization/sectors/new", element: <EntityRecordPage catalog="sectors" mode="new" /> },
                  { path: "/organization/sectors/:id/edit", element: <EntityRecordPage catalog="sectors" mode="edit" /> },
                  { path: "/organization/sectors/:id", element: <EntityRecordPage catalog="sectors" mode="view" /> },
                  { path: "/organization/teams/new", element: <EntityRecordPage catalog="teams" mode="new" /> },
                  { path: "/organization/teams/:id/edit", element: <EntityRecordPage catalog="teams" mode="edit" /> },
                  { path: "/organization/teams/:id", element: <EntityRecordPage catalog="teams" mode="view" /> },
                  { path: "/labor-rules/unions/new", element: <EntityRecordPage catalog="unions" mode="new" /> },
                  { path: "/labor-rules/unions/:id/edit", element: <EntityRecordPage catalog="unions" mode="edit" /> },
                  { path: "/labor-rules/unions/:id", element: <EntityRecordPage catalog="unions" mode="view" /> },
                  { path: "/labor-rules/agreements/new", element: <EntityRecordPage catalog="agreements" mode="new" /> },
                  { path: "/labor-rules/agreements/:id/edit", element: <EntityRecordPage catalog="agreements" mode="edit" /> },
                  { path: "/labor-rules/agreements/:id", element: <EntityRecordPage catalog="agreements" mode="view" /> },
                  { path: "/labor-rules/holidays/new", element: <EntityRecordPage catalog="holidays" mode="new" /> },
                  { path: "/labor-rules/holidays/:id/edit", element: <EntityRecordPage catalog="holidays" mode="edit" /> },
                  { path: "/labor-rules/holidays/:id", element: <EntityRecordPage catalog="holidays" mode="view" /> },
                  { path: "/labor-rules/punch-rules/new", element: <EntityRecordPage catalog="punch-rules" mode="new" /> },
                  { path: "/labor-rules/punch-rules/:id/edit", element: <EntityRecordPage catalog="punch-rules" mode="edit" /> },
                  { path: "/labor-rules/punch-rules/:id", element: <EntityRecordPage catalog="punch-rules" mode="view" /> },
                  { path: "/reasons/reason-adjustment/new", element: <EntityRecordPage catalog="reason-adjustment" mode="new" /> },
                  { path: "/reasons/reason-adjustment/:id/edit", element: <EntityRecordPage catalog="reason-adjustment" mode="edit" /> },
                  { path: "/reasons/reason-adjustment/:id", element: <EntityRecordPage catalog="reason-adjustment" mode="view" /> },
                  { path: "/reasons/reason-absence/new", element: <EntityRecordPage catalog="reason-absence" mode="new" /> },
                  { path: "/reasons/reason-absence/:id/edit", element: <EntityRecordPage catalog="reason-absence" mode="edit" /> },
                  { path: "/reasons/reason-absence/:id", element: <EntityRecordPage catalog="reason-absence" mode="view" /> },
                  { path: "/reasons/reason-allowance/new", element: <EntityRecordPage catalog="reason-allowance" mode="new" /> },
                  { path: "/reasons/reason-allowance/:id/edit", element: <EntityRecordPage catalog="reason-allowance" mode="edit" /> },
                  { path: "/reasons/reason-allowance/:id", element: <EntityRecordPage catalog="reason-allowance" mode="view" /> },
                  { path: "/reasons/reason-certificate/new", element: <EntityRecordPage catalog="reason-certificate" mode="new" /> },
                  { path: "/reasons/reason-certificate/:id/edit", element: <EntityRecordPage catalog="reason-certificate" mode="edit" /> },
                  { path: "/reasons/reason-certificate/:id", element: <EntityRecordPage catalog="reason-certificate" mode="view" /> },
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
