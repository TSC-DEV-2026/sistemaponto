import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"

import { GlobalLoader } from "@/components/GlobalLoader"
import { AppShell } from "@/components/layouts/AppShell"
import { PrivateRoute } from "@/components/PrivateRoute"
import { RouteLoader } from "@/components/RouteLoader"
import { TenantRoute } from "@/components/TenantRoute"
import { shellItems } from "@/navigation"
import { ChangePasswordPage } from "@/pages/ChangePasswordPage"
import { DomainPage } from "@/pages/DomainPage"
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

function RootLayout() {
  return (
    <>
      <RouteLoader />
      <Outlet />
    </>
  )
}

const domainRoutes = shellItems
  .filter((item) => item.sections.length > 0)
  .map((item) => ({ path: item.to, element: <DomainPage /> }))

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
                  ...domainRoutes,
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
