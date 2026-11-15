import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useParams } from "react-router-dom"

import { legacyPath } from "@/route-slugs"

import { AppShell } from "@/components/layouts/AppShell"
import { Toaster } from "@/components/ui/toaster"
import { PrivateRoute } from "@/components/PrivateRoute"
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
import { TenantFormPage } from "@/pages/TenantFormPage"
import { TenantsPage } from "@/pages/TenantsPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { ApuracaoDayPage } from "@/pages/workforce/ApuracaoDayPage"
import { BulkChangesPage } from "@/pages/workforce/BulkChangesPage"
import { ClockDevicesPage } from "@/pages/workforce/ClockDevicesPage"
import { EmployeeFormPage } from "@/pages/workforce/EmployeeFormPage"
import { EmployeePage } from "@/pages/workforce/EmployeePage"
import { HourBankEntryPage, JourneyPage, PunchAdjustPage } from "@/pages/workforce/JourneyPage"
import {
  LaborPage,
  NotificationsPage,
  OrganizationPage,
  PayrollPage,
  ReasonsPage,
  ReportsPage,
  RequestsPage,
  TimeClockPage,
} from "@/pages/workforce/OperationsPages"
import { ClassificationValueFormPage, EntityRecordPage } from "@/pages/workforce/EntityScreens"
import { OccurrenceEntryPage, OccurrencesPage } from "@/pages/workforce/OccurrencePages"
import { PeoplePage } from "@/pages/workforce/PeoplePage"
import { ClosingFormPage } from "@/pages/workforce/ClosingFormPage"
import { ClosingResultPage } from "@/pages/workforce/ClosingResultPage"
import { RequestFormPage } from "@/pages/workforce/RequestFormPage"

function LegacyJourneyRedirect() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const suffix = pathname.endsWith("/edit") ? "/edit" : ""
  return <Navigate to={`/staff/journeys/${id}${suffix}`} replace />
}

function LegacyRouteRedirect() {
  const location = useLocation()
  return <Navigate to={legacyPath(location.pathname, location.search)} replace />
}

function RootLayout() {
  return <Outlet />
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
                  { path: "/tenants/new", element: <TenantFormPage /> },
                  { path: "/tenants/:id/edit", element: <TenantDetailPage mode="edit" /> },
                  { path: "/tenants/:id", element: <TenantDetailPage mode="view" /> },
                  { path: "/change-password", element: <ChangePasswordPage /> },
                  { path: "/schedules/journeys/new", element: <Navigate to="/staff/journeys/new" replace /> },
                  { path: "/schedules/journeys/:id/edit", element: <LegacyJourneyRedirect /> },
                  { path: "/schedules/journeys/:id", element: <LegacyJourneyRedirect /> },
                  { path: "/schedules/*", element: <LegacyRouteRedirect /> },
                  { path: "/schedules", element: <LegacyRouteRedirect /> },
                  { path: "/timekeeping/adjustments", element: <PunchAdjustPage /> },
                  { path: "/timekeeping/hour-bank/new", element: <HourBankEntryPage /> },
                  { path: "/timekeeping/calculation/:workDate", element: <ApuracaoDayPage /> },
                  { path: "/timekeeping", element: <JourneyPage /> },
                  { path: "/time-clock", element: <TimeClockPage /> },
                  { path: "/occurrences/new", element: <OccurrenceEntryPage /> },
                  { path: "/occurrences", element: <OccurrencesPage /> },
                  { path: "/requests", element: <RequestsPage /> },
                  { path: "/requests/new", element: <RequestFormPage /> },
                  { path: "/closings/new", element: <ClosingFormPage /> },
                  { path: "/closings/:id", element: <ClosingResultPage /> },
                  { path: "/closings", element: <Navigate to="/timekeeping?tab=closing" replace /> },
                  { path: "/people/*", element: <LegacyRouteRedirect /> },
                  { path: "/people", element: <LegacyRouteRedirect /> },
                  { path: "/staff/new", element: <EmployeeFormPage /> },
                  { path: "/staff/:id/edit", element: <EmployeeFormPage /> },
                  { path: "/staff/journeys/new", element: <EntityRecordPage catalog="journeys" mode="new" /> },
                  { path: "/staff/journeys/:id/edit", element: <EntityRecordPage catalog="journeys" mode="edit" /> },
                  { path: "/staff/journeys/:id", element: <EntityRecordPage catalog="journeys" mode="view" /> },
                  { path: "/staff/jobs/new", element: <EntityRecordPage catalog="jobs" mode="new" /> },
                  { path: "/staff/jobs/:id/edit", element: <EntityRecordPage catalog="jobs" mode="edit" /> },
                  { path: "/staff/jobs/:id", element: <EntityRecordPage catalog="jobs" mode="view" /> },
                  { path: "/staff/classifications/new", element: <EntityRecordPage catalog="classifications" mode="new" /> },
                  { path: "/staff/classifications/:id/edit", element: <EntityRecordPage catalog="classifications" mode="edit" /> },
                  { path: "/staff/classifications/:id/values/new", element: <ClassificationValueFormPage mode="new" /> },
                  { path: "/staff/classifications/:id/values/:valueId/edit", element: <ClassificationValueFormPage mode="edit" /> },
                  { path: "/staff/classifications/:id/values/:valueId", element: <ClassificationValueFormPage mode="view" /> },
                  { path: "/staff/classifications/:id", element: <EntityRecordPage catalog="classifications" mode="view" /> },
                  { path: "/staff/cost-centers/new", element: <Navigate to="/staff/classifications/new" replace /> },
                  { path: "/staff/cost-centers/:id/edit", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/cost-centers/:id", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/cost-centers", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/:id", element: <EmployeePage /> },
                  { path: "/staff", element: <PeoplePage /> },
                  { path: "/clock-devices", element: <ClockDevicesPage /> },
                  { path: "/bulk-changes", element: <BulkChangesPage /> },
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
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
