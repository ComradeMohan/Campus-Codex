"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3 flex-1">
              {props.variant === 'destructive' ? (
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div className="grid gap-0.5">
                {title && <ToastTitle className="text-sm font-bold tracking-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs opacity-90 leading-normal">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
