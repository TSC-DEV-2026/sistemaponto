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
  invalid?: boolean
  password?: boolean
  children: ReactElement<{ className?: string }>
}

const fieldClassName =
  "h-[50px] w-full rounded-[10px] border border-solid border-[#E4E8ED] bg-white !pl-[44px] text-[15px] font-normal text-brand-ink shadow-[0_4px_10px_rgba(15,23,42,0.035),0_10px_22px_rgba(15,23,42,0.045)] outline-none ring-0 focus-visible:ring-0 transition-[border-color,box-shadow] duration-[160ms] ease-[ease] placeholder:text-sm placeholder:font-normal placeholder:text-brand-placeholder disabled:cursor-not-allowed disabled:border-[#E4E8ED] disabled:bg-brand-paper disabled:text-brand-placeholder disabled:shadow-none disabled:hover:border-[#E4E8ED] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0A0A] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out]"

export const authButtonClass =
  "mt-6 h-[50px] w-full rounded-[10px] bg-[#18944B] text-[15px] font-semibold text-white shadow-[0_8px_16px_rgba(24,148,75,0.16),0_14px_28px_rgba(24,148,75,0.10)] transition-[background-color,box-shadow] duration-[160ms] ease-[ease] hover:bg-[#1B9F53] hover:shadow-[0_10px_22px_rgba(24,148,75,0.22),0_16px_30px_rgba(24,148,75,0.12)] active:bg-[#168845] disabled:bg-brand-line disabled:text-brand-placeholder disabled:opacity-100 disabled:shadow-none"

const passwordEyeClass =
  "[&_button]:text-[#94A3B8] [&_button:hover]:text-[#64748B] [&_button_svg]:h-[18px] [&_button_svg]:w-[18px] [&_button_svg]:stroke-[1.75] [&_button:focus-visible]:rounded-md [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[rgb(124_207_18/0.35)]"

export function authInputClass(invalid: boolean, password = false) {
  return cn(
    fieldClassName,
    password ? "!pr-[44px]" : "!pr-[14px]",
    invalid
      ? "border-brand-danger hover:border-brand-danger focus:border-brand-danger focus:shadow-[0_0_0_1px_rgba(239,83,80,0.12),0_6px_18px_rgba(239,83,80,0.10)] hover:focus:border-brand-danger"
      : "hover:border-[#C5CDD6] focus:border-[#53bb7e] focus:shadow-[0_0_0_1px_rgba(50,149,92,0.22),0_6px_18px_rgba(50,149,92,0.16),0_10px_28px_rgba(80,186,130,0.18)] hover:focus:border-[#56ad7b]",
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
      <div className="w-full max-w-[480px] rounded-2xl border border-[#E7EBF0] bg-white px-6 py-8 shadow-[0_10px_30px_rgba(15,23,42,0.055),0_24px_55px_rgba(15,23,42,0.045)] sm:px-9 sm:py-10 lg:px-10">
        <p className="text-center text-base font-semibold tracking-tight text-[#1B2534]">
          sistema<span className="text-[#2DA468]">ponto</span>
        </p>
        <h1 className="mt-4 text-center text-[32px] font-bold leading-none tracking-tight text-[#1B2534]">{title}</h1>
        <p className="mt-2.5 text-center text-[15px] leading-6 text-[#6E747F]">{description}</p>
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

export function FieldBlock({ id, label, icon: Icon, invalid = false, password = false, children }: FieldProps) {
  const input = cloneElement(children, {
    className: cn(authInputClass(invalid, password), children.props.className),
  })

  return (
    <div className="group space-y-2">
      <Label className="text-sm font-semibold text-[#1B2534]" htmlFor={id}>
        {label}
      </Label>
      <div className={cn("relative", password && passwordEyeClass)}>
        {input}
        <Icon className="pointer-events-none absolute left-[14px] top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8] group-has-[:disabled]:text-[#C5CDD6]" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  )
}

export function AuthPrompt({ hint, action, to }: { hint: string; action: string; to: string }) {
  return (
    <p className="mt-6 text-center text-sm leading-6 text-[#71717A]">
      <span className="mr-1.5">{hint}</span>
      <Link
        to={to}
        className="font-semibold text-[#1E8A3A] transition-colors duration-150 hover:text-[#187432] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E8A3A]/30"
      >
        {action}
      </Link>
    </p>
  )
}
