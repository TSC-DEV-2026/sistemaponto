import { cloneElement, type ReactElement, type ReactNode } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"

import { Label } from "@/components/ui/label"
import { cn } from "@/utils/cn"

type Side = "left" | "right"

type AuthScreenProps = {
  title: string
  description: string
  side?: Side
  children: ReactNode
}

type FieldProps = {
  id: string
  label: string
  icon: LucideIcon
  password?: boolean
  children: ReactElement<{ className?: string }>
}

const fieldClassName =
  "h-[50px] w-full rounded-[10px] border border-solid border-ui-line-field bg-white !pl-[44px] text-[15px] font-normal text-brand-ink shadow-[0_4px_10px_rgb(var(--ui-shadow)/0.035),0_10px_22px_rgb(var(--ui-shadow)/0.045)] outline-none ring-0 focus-visible:ring-0 transition-[border-color,box-shadow] duration-[160ms] ease-[ease] placeholder:text-sm placeholder:font-normal placeholder:text-brand-placeholder disabled:cursor-not-allowed disabled:border-ui-line-field disabled:bg-brand-paper disabled:text-brand-placeholder disabled:shadow-none disabled:hover:border-ui-line-field [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(var(--ui-ink))] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out]"

export const authButtonClass =
  "mt-6 h-[50px] w-full rounded-[10px] bg-brand-auth text-[15px] font-semibold text-white shadow-[0_8px_16px_rgb(var(--brand-auth)/0.16),0_14px_28px_rgb(var(--brand-auth)/0.10)] transition-[background-color,box-shadow] duration-[160ms] ease-[ease] hover:bg-brand-auth-hover hover:shadow-[0_10px_22px_rgb(var(--brand-auth)/0.22),0_16px_30px_rgb(var(--brand-auth)/0.12)] active:bg-brand-auth-active disabled:bg-brand-line disabled:text-brand-placeholder disabled:opacity-100 disabled:shadow-none"

const passwordEyeClass =
  "[&_button]:text-ui-slate-soft [&_button:hover]:text-ui-slate [&_button_svg]:h-[18px] [&_button_svg]:w-[18px] [&_button_svg]:stroke-[1.75] [&_button:focus-visible]:rounded-md [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[rgb(124_207_18/0.35)]"

export function authInputClass(password = false) {
  return cn(
    fieldClassName,
    password ? "!pr-[44px]" : "!pr-[14px]",
    "hover:border-ui-line-hover focus:border-brand-focus focus:shadow-[0_0_0_1px_rgb(var(--brand-focus-ring)/0.22),0_6px_18px_rgb(var(--brand-focus-ring)/0.16),0_10px_28px_rgb(var(--brand-focus-glow)/0.18)] hover:focus:border-brand-focus-hover",
  )
}

function GrayPanel() {
  return (
    <div className="relative hidden w-1/2 shrink-0 overflow-hidden bg-brand-panel md:block" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/[0.035] to-black/[0.07]" />
    </div>
  )
}

export function AuthScreen({ title, description, side = "right", children }: AuthScreenProps) {
  const stage = (
    <div className="flex min-h-dvh w-full min-w-0 items-center justify-center bg-brand-paper bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.72),rgba(244,244,245,0)_68%)] px-5 py-8 md:w-1/2 md:px-6 lg:px-10">
      <div className="w-full max-w-[480px] rounded-2xl border border-ui-line-hair bg-white px-6 py-8 shadow-[0_10px_30px_rgb(var(--ui-shadow)/0.055),0_24px_55px_rgb(var(--ui-shadow)/0.045)] sm:px-9 sm:py-10 lg:px-10">
        <p className="text-center text-base font-semibold tracking-tight text-ui-heading">
          sistema<span className="text-brand-wordmark">ponto</span>
        </p>
        <h1 className="mt-4 text-center text-[32px] font-bold leading-none tracking-tight text-ui-heading">{title}</h1>
        <p className="mt-2.5 text-center text-[15px] leading-6 text-ui-body">{description}</p>
        {children}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-brand-paper">
      {side === "right" ? <GrayPanel /> : null}
      {stage}
      {side === "left" ? <GrayPanel /> : null}
    </div>
  )
}

export function FieldBlock({ id, label, icon: Icon, password = false, children }: FieldProps) {
  const input = cloneElement(children, {
    className: cn(authInputClass(password), children.props.className),
  })

  return (
    <div className="group space-y-2">
      <Label className="text-sm font-semibold text-ui-heading" htmlFor={id}>
        {label}
      </Label>
      <div className={cn("relative", password && passwordEyeClass)}>
        {input}
        <Icon className="pointer-events-none absolute left-[14px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-ui-slate-soft group-has-[:disabled]:text-ui-line-hover" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  )
}

export function AuthPrompt({ hint, action, to }: { hint: string; action: string; to: string }) {
  return (
    <p className="mt-6 text-center text-sm leading-6 text-brand-quiet">
      <span className="mr-1.5">{hint}</span>
      <Link
        to={to}
        className="font-semibold text-brand-cta transition-colors duration-150 hover:text-brand-cta-deep hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta/30"
      >
        {action}
      </Link>
    </p>
  )
}
