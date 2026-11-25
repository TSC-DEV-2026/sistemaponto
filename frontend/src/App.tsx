import { lazy, Suspense, type ReactElement, type ReactNode } from "react"
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

const ApuracaoDayPage = lazy(() => import("@/pages/workforce/ApuracaoDayPage").then((m) => ({ default: m.ApuracaoDayPage })))
const BulkChangesPage = lazy(() => import("@/pages/workforce/BulkChangesPage").then((m) => ({ default: m.BulkChangesPage })))
const ClockDevicesPage = lazy(() => import("@/pages/workforce/ClockDevicesPage").then((m) => ({ default: m.ClockDevicesPage })))
const EmployeeFormPage = lazy(() => import("@/pages/workforce/EmployeeFormPage").then((m) => ({ default: m.EmployeeFormPage })))
const EmployeePage = lazy(() => import("@/pages/workforce/EmployeePage").then((m) => ({ default: m.EmployeePage })))
const JourneyPage = lazy(() => import("@/pages/workforce/JourneyPage").then((m) => ({ default: m.JourneyPage })))
const HourBankEntryPage = lazy(() => import("@/pages/workforce/JourneyPage").then((m) => ({ default: m.HourBankEntryPage })))
const PunchAdjustPage = lazy(() => import("@/pages/workforce/JourneyPage").then((m) => ({ default: m.PunchAdjustPage })))
const LaborPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.LaborPage })))
const NotificationsPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.NotificationsPage })))
const OrganizationPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.OrganizationPage })))
const PayrollPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.PayrollPage })))
const ReportsPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.ReportsPage })))
const RequestsPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.RequestsPage })))
const TimeClockPage = lazy(() => import("@/pages/workforce/OperationsPages").then((m) => ({ default: m.TimeClockPage })))
const EntityRecordPage = lazy(() => import("@/pages/workforce/EntityScreens").then((m) => ({ default: m.EntityRecordPage })))
const CategoryValueFormPage = lazy(() => import("@/pages/workforce/EntityScreens").then((m) => ({ default: m.CategoryValueFormPage })))
const OccurrencesPage = lazy(() => import("@/pages/workforce/OccurrencePages").then((m) => ({ default: m.OccurrencesPage })))
const OccurrenceEntryPage = lazy(() => import("@/pages/workforce/OccurrencePages").then((m) => ({ default: m.OccurrenceEntryPage })))
const OccurrenceRecordPage = lazy(() => import("@/pages/workforce/OccurrencePages").then((m) => ({ default: m.OccurrenceRecordPage })))
const PeoplePage = lazy(() => import("@/pages/workforce/PeoplePage").then((m) => ({ default: m.PeoplePage })))
const ClosingFormPage = lazy(() => import("@/pages/workforce/ClosingFormPage").then((m) => ({ default: m.ClosingFormPage })))
const ClosingResultPage = lazy(() => import("@/pages/workforce/ClosingResultPage").then((m) => ({ default: m.ClosingResultPage })))
const RequestFormPage = lazy(() => import("@/pages/workforce/RequestFormPage").then((m) => ({ default: m.RequestFormPage })))

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="px-6 py-8 text-sm text-brand-quiet">Carregando…</div>}>{children}</Suspense>
}

function lazyElement(node: ReactElement) {
  return <LazyPage>{node}</LazyPage>
}

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
                  { path: "/timekeeping", element: lazyElement(<JourneyPage />) },
                  { path: "/calculations/:workDate", element: lazyElement(<ApuracaoDayPage />) },
                  { path: "/punches/corrections", element: lazyElement(<PunchAdjustPage />) },
                  { path: "/hour-bank-entries/new", element: lazyElement(<HourBankEntryPage />) },
                  { path: "/hour-bank-entries/:id/edit", element: lazyElement(<HourBankEntryPage />) },
                  { path: "/time-clock", element: <LegacyRouteRedirect /> },
                  { path: "/punches", element: lazyElement(<TimeClockPage />) },
                  { path: "/occurrences/new", element: lazyElement(<OccurrenceEntryPage />) },
                  { path: "/occurrences/:id/edit", element: lazyElement(<OccurrenceRecordPage mode="edit" />) },
                  { path: "/occurrences/:id", element: lazyElement(<OccurrenceRecordPage mode="view" />) },
                  { path: "/occurrences", element: lazyElement(<OccurrencesPage />) },
                  { path: "/requests", element: lazyElement(<RequestsPage />) },
                  { path: "/requests/new", element: lazyElement(<RequestFormPage />) },
                  { path: "/closings/new", element: lazyElement(<ClosingFormPage />) },
                  { path: "/closings/:id", element: lazyElement(<ClosingResultPage />) },
                  { path: "/closings", element: <Navigate to="/timekeeping?tab=closings" replace /> },
                  { path: "/people/*", element: <LegacyRouteRedirect /> },
                  { path: "/people", element: <LegacyRouteRedirect /> },
                  { path: "/staff/new", element: <LegacyRouteRedirect /> },
                  { path: "/staff/:id/edit", element: <LegacyRouteRedirect /> },
                  { path: "/staff/journeys/*", element: <LegacyRouteRedirect /> },
                  { path: "/staff/jobs/*", element: <LegacyRouteRedirect /> },
                  { path: "/staff/classifications/*", element: <LegacyRouteRedirect /> },
                  { path: "/employees/new", element: lazyElement(<EmployeeFormPage />) },
                  { path: "/employees/:id/edit", element: lazyElement(<EmployeeFormPage />) },
                  { path: "/journeys/new", element: lazyElement(<EntityRecordPage catalog="journeys" mode="new" />) },
                  { path: "/journeys/:id/edit", element: lazyElement(<EntityRecordPage catalog="journeys" mode="edit" />) },
                  { path: "/journeys/:id", element: lazyElement(<EntityRecordPage catalog="journeys" mode="view" />) },
                  { path: "/jobs/new", element: lazyElement(<EntityRecordPage catalog="jobs" mode="new" />) },
                  { path: "/jobs/:id/edit", element: lazyElement(<EntityRecordPage catalog="jobs" mode="edit" />) },
                  { path: "/jobs/:id", element: lazyElement(<EntityRecordPage catalog="jobs" mode="view" />) },
                  { path: "/groups/*", element: <LegacyRouteRedirect /> },
                  { path: "/groups", element: <LegacyRouteRedirect /> },
                  { path: "/categories/new", element: lazyElement(<EntityRecordPage catalog="categories" mode="new" />) },
                  { path: "/categories/:id/edit", element: lazyElement(<EntityRecordPage catalog="categories" mode="edit" />) },
                  { path: "/categories/:id/values/new", element: lazyElement(<CategoryValueFormPage mode="new" />) },
                  { path: "/categories/:id/values/:valueId/edit", element: lazyElement(<CategoryValueFormPage mode="edit" />) },
                  { path: "/categories/:id/values/:valueId", element: lazyElement(<CategoryValueFormPage mode="view" />) },
                  { path: "/categories/:id", element: lazyElement(<EntityRecordPage catalog="categories" mode="view" />) },
                  { path: "/staff/cost-centers/new", element: <Navigate to="/categories/new" replace /> },
                  { path: "/staff/cost-centers/:id/edit", element: <Navigate to="/structure?tab=categories" replace /> },
                  { path: "/staff/cost-centers/:id", element: <Navigate to="/structure?tab=categories" replace /> },
                  { path: "/staff/cost-centers", element: <Navigate to="/structure?tab=categories" replace /> },
                  { path: "/staff/:id", element: <LegacyRouteRedirect /> },
                  { path: "/employees/:id", element: lazyElement(<EmployeePage />) },
                  { path: "/staff", element: lazyElement(<PeoplePage />) },
                  { path: "/clock-devices", element: lazyElement(<ClockDevicesPage />) },
                  { path: "/bulk-changes", element: lazyElement(<BulkChangesPage />) },
                  { path: "/organization/units/*", element: <LegacyRouteRedirect /> },
                  { path: "/organization/sectors/*", element: <LegacyRouteRedirect /> },
                  { path: "/organization/teams/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules/*", element: <LegacyRouteRedirect /> },
                  { path: "/labor-rules", element: <LegacyRouteRedirect /> },
                  { path: "/unions/*", element: <LegacyRouteRedirect /> },
                  { path: "/unions", element: <LegacyRouteRedirect /> },
                  { path: "/agreements/*", element: <LegacyRouteRedirect /> },
                  { path: "/agreements", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-adjustment/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-absence/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-allowance/*", element: <LegacyRouteRedirect /> },
                  { path: "/reasons/reason-certificate/*", element: <LegacyRouteRedirect /> },
                  { path: "/notifications", element: <LegacyRouteRedirect /> },
                  { path: "/units/new", element: lazyElement(<EntityRecordPage catalog="units" mode="new" />) },
                  { path: "/units/:id/edit", element: lazyElement(<EntityRecordPage catalog="units" mode="edit" />) },
                  { path: "/units/:id", element: lazyElement(<EntityRecordPage catalog="units" mode="view" />) },
                  { path: "/sectors/*", element: <Navigate to="/structure?tab=teams" replace /> },
                  { path: "/sectors", element: <Navigate to="/structure?tab=teams" replace /> },
                  { path: "/teams/new", element: lazyElement(<EntityRecordPage catalog="teams" mode="new" />) },
                  { path: "/teams/:id/edit", element: lazyElement(<EntityRecordPage catalog="teams" mode="edit" />) },
                  { path: "/teams/:id", element: lazyElement(<EntityRecordPage catalog="teams" mode="view" />) },
                  { path: "/norms/new", element: lazyElement(<EntityRecordPage catalog="norms" mode="new" />) },
                  { path: "/norms/:id/edit", element: lazyElement(<EntityRecordPage catalog="norms" mode="edit" />) },
                  { path: "/norms/:id", element: lazyElement(<EntityRecordPage catalog="norms" mode="view" />) },
                  { path: "/holidays/new", element: lazyElement(<EntityRecordPage catalog="holidays" mode="new" />) },
                  { path: "/holidays/:id/edit", element: lazyElement(<EntityRecordPage catalog="holidays" mode="edit" />) },
                  { path: "/holidays/:id", element: lazyElement(<EntityRecordPage catalog="holidays" mode="view" />) },
                  { path: "/punch-rules/new", element: <Navigate to="/norms/new" replace /> },
                  { path: "/punch-rules/:id/edit", element: <Navigate to="/punch-rules?tab=norms" replace /> },
                  { path: "/punch-rules/:id", element: <Navigate to="/punch-rules?tab=norms" replace /> },
                  { path: "/reasons/new", element: lazyElement(<EntityRecordPage catalog="reasons" mode="new" />) },
                  { path: "/reasons/:id/edit", element: lazyElement(<EntityRecordPage catalog="reasons" mode="edit" />) },
                  { path: "/reasons/:id", element: lazyElement(<EntityRecordPage catalog="reasons" mode="view" />) },
                  { path: "/reports", element: lazyElement(<ReportsPage />) },
                  { path: "/notices", element: lazyElement(<NotificationsPage />) },
                  { path: "/organization", element: <LegacyRouteRedirect /> },
                  { path: "/structure", element: lazyElement(<OrganizationPage />) },
                  { path: "/punch-rules", element: lazyElement(<LaborPage />) },
                  { path: "/payroll", element: <LegacyRouteRedirect /> },
                  { path: "/integrations", element: lazyElement(<PayrollPage />) },
                  { path: "/reasons", element: <Navigate to="/punch-rules?tab=reasons" replace /> },
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
