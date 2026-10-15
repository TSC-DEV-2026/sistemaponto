import { createContext, useRef, useState, type FormEvent, type FormHTMLAttributes } from "react"

export const FormPendingContext = createContext(false)

type ActionFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
}

export function ActionForm({ onSubmit, children, ...props }: ActionFormProps) {
  const [pending, setPending] = useState(false)
  const lock = useRef(false)

  function finish() {
    lock.current = false
    setPending(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setPending(true)
    let result: void | Promise<void>
    try {
      result = onSubmit(event)
    } catch (error) {
      finish()
      throw error
    }
    void Promise.resolve(result).finally(finish)
  }

  return (
    <form {...props} onSubmit={handleSubmit}>
      <FormPendingContext.Provider value={pending}>{children}</FormPendingContext.Provider>
    </form>
  )
}
