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
import { GroupValueFormPage, EntityRecordPage, ReasonRecordPage } from "@/pages/workforce/EntityScreens"
import { OccurrenceEntryPage, OccurrencesPage } from "@/pages/workforce/OccurrencePages"
import { PeoplePage } from "@/pages/workforce/PeoplePage"
import { ClosingFormPage } from "@/pages/workforce/ClosingFormPage"
import { ClosingResultPage } from "@/pages/workforce/ClosingResultPage"
import { RequestFormPage } from "@/pages/workforce/RequestFormPage"

function LegacyJourneyRedirect() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const suffix = pathname.endsWith("/edit") ? "/edit" : ""
  return <Navigate to={`/journeys/${id}${suffix}`} replace />
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
                  { path: "/schedules/journeys/new", element: <Navigate to="/journeys/new" replace /> },
                  { path: "/schedules/journeys/:id/edit", element: <LegacyJourneyRedirect /> },
                  { path: "/schedules/journeys/:id", element: <LegacyJourneyRedirect /> },
                  { path: "/schedules/*", element: <LegacyRouteRedirect /> },
                  { path: "/schedules", element: <LegacyRouteRedirect /> },
                  { path: "/timekeeping/adjustments", element: <LegacyRouteRedirect /> },
                  { path: "/timekeeping/hour-bank/new", element: <LegacyRouteRedirect /> },
                  { path: "/timekeeping/calculation/:workDate", element: <LegacyRouteRedirect /> },
                  { path: "/timekeeping", element: <JourneyPage /> },
                  { path: "/calculations/:workDate", element: <ApuracaoDayPage /> },
                  { path: "/punches/corrections", element: <PunchAdjustPage /> },
                  { path: "/hour-bank-entries/new", element: <HourBankEntryPage /> },
                  { path: "/time-clock", element: <LegacyRouteRedirect /> },
                  { path: "/punches", element: <TimeClockPage /> },
                  { path: "/occurrences/new", element: <OccurrenceEntryPage /> },
                  { path: "/occurrences", element: <OccurrencesPage /> },
                  { path: "/requests", element: <RequestsPage /> },
                  { path: "/requests/new", element: <RequestFormPage /> },
                  { path: "/closings/new", element: <ClosingFormPage /> },
                  { path: "/closings/:id", element: <ClosingResultPage /> },
                  { path: "/closings", element: <Navigate to="/timekeeping?tab=closings" replace /> },
                  { path: "/people/*", element: <LegacyRouteRedirect /> },
                  { path: "/people", element: <LegacyRouteRedirect /> },
                  { path: "/staff/new", element: <LegacyRouteRedirect /> },
                  { path: "/staff/:id/edit", element: <LegacyRouteRedirect /> },
                  { path: "/staff/journeys/*", element: <LegacyRouteRedirect /> },
                  { path: "/staff/jobs/*", element: <LegacyRouteRedirect /> },
                  { path: "/staff/classifications/*", element: <LegacyRouteRedirect /> },
                  { path: "/employees/new", element: <EmployeeFormPage /> },
                  { path: "/employees/:id/edit", element: <EmployeeFormPage /> },
                  { path: "/journeys/new", element: <EntityRecordPage catalog="journeys" mode="new" /> },
                  { path: "/journeys/:id/edit", element: <EntityRecordPage catalog="journeys" mode="edit" /> },
                  { path: "/journeys/:id", element: <EntityRecordPage catalog="journeys" mode="view" /> },
                  { path: "/jobs/new", element: <EntityRecordPage catalog="jobs" mode="new" /> },
                  { path: "/jobs/:id/edit", element: <EntityRecordPage catalog="jobs" mode="edit" /> },
                  { path: "/jobs/:id", element: <EntityRecordPage catalog="jobs" mode="view" /> },
                  { path: "/groups/new", element: <EntityRecordPage catalog="groups" mode="new" /> },
                  { path: "/groups/:id/edit", element: <EntityRecordPage catalog="groups" mode="edit" /> },
                  { path: "/groups/:id/values/new", element: <GroupValueFormPage mode="new" /> },
                  { path: "/groups/:id/values/:valueId/edit", element: <GroupValueFormPage mode="edit" /> },
                  { path: "/groups/:id/values/:valueId", element: <GroupValueFormPage mode="view" /> },
                  { path: "/groups/:id", element: <EntityRecordPage catalog="groups" mode="view" /> },
                  { path: "/staff/cost-centers/new", element: <Navigate to="/groups/new" replace /> },
                  { path: "/staff/cost-centers/:id/edit", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/cost-centers/:id", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/cost-centers", element: <Navigate to="/staff?tab=groups" replace /> },
                  { path: "/staff/:id", element: <LegacyRouteRedirect /> },
                  { path: "/employees/:id", element: <EmployeePage /> },
                  { path: "/staff", element: <PeoplePage /> },
                  { path: "/clock-devices", element: <ClockDevicesPage /> },
                  { path: "/bulk-changes", element: <BulkChangesPage /> },
                  { path: "/organization/units/*", element: <LegacyRouteRedirect /> },
                  { path: "/organization/sectors/*", element: <LegacyRouteRedirect /> },
                  { path: "/organization/teams/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules/unions/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules/agreements/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules/holidays/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules/punch-rules/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-adjustment/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-absence/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-allowance/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-certificate/*", element: <LegacyRouteRedirect /> },
                  { path: "/notifications", element: <LegacyRouteRedirect /> },
                  { path: "/units/new", element: <EntityRecordPage catalog="units" mode="new" /> },
                  { path: "/units/:id/edit", element: <EntityRecordPage catalog="units" mode="edit" /> },
                  { path: "/units/:id", element: <EntityRecordPage catalog="units" mode="view" /> },
                  { path: "/sectors/new", element: <EntityRecordPage catalog="sectors" mode="new" /> },
                  { path: "/sectors/:id/edit", element: <EntityRecordPage catalog="sectors" mode="edit" /> },
                  { path: "/sectors/:id", element: <EntityRecordPage catalog="sectors" mode="view" /> },
                  { path: "/teams/new", element: <EntityRecordPage catalog="teams" mode="new" /> },
                  { path: "/teams/:id/edit", element: <EntityRecordPage catalog="teams" mode="edit" /> },
                  { path: "/teams/:id", element: <EntityRecordPage catalog="teams" mode="view" /> },
                  { path: "/unions/new", element: <EntityRecordPage catalog="unions" mode="new" /> },
                  { path: "/unions/:id/edit", element: <EntityRecordPage catalog="unions" mode="edit" /> },
                  { path: "/unions/:id", element: <EntityRecordPage catalog="unions" mode="view" /> },
                  { path: "/agreements/new", element: <EntityRecordPage catalog="agreements" mode="new" /> },
                  { path: "/agreements/:id/edit", element: <EntityRecordPage catalog="agreements" mode="edit" /> },
                  { path: "/agreements/:id", element: <EntityRecordPage catalog="agreements" mode="view" /> },
                  { path: "/holidays/new", element: <EntityRecordPage catalog="holidays" mode="new" /> },
                  { path: "/holidays/:id/edit", element: <EntityRecordPage catalog="holidays" mode="edit" /> },
                  { path: "/holidays/:id", element: <EntityRecordPage catalog="holidays" mode="view" /> },
                  { path: "/punch-rules/new", element: <EntityRecordPage catalog="punch-rules" mode="new" /> },
                  { path: "/punch-rules/:id/edit", element: <EntityRecordPage catalog="punch-rules" mode="edit" /> },
                  { path: "/punch-rules/:id", element: <EntityRecordPage catalog="punch-rules" mode="view" /> },
                  { path: "/reasons/new", element: <ReasonRecordPage mode="new" /> },
                  { path: "/reasons/:id/edit", element: <ReasonRecordPage mode="edit" /> },
                  { path: "/reasons/:id", element: <ReasonRecordPage mode="view" /> },
                  { path: "/reports", element: <ReportsPage /> },
                  { path: "/notices", element: <NotificationsPage /> },
                  { path: "/organization", element: <LegacyRouteRedirect /> },
                  { path: "/structure", element: <OrganizationPage /> },
                  { path: "/labor-rules", element: <LaborPage /> },
                  { path: "/payroll", element: <LegacyRouteRedirect /> },
                  { path: "/integrations", element: <PayrollPage /> },
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
