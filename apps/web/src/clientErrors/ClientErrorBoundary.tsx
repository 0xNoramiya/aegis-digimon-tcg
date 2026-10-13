import { Component, type ErrorInfo, type ReactNode } from "react";
import { ClientErrorKind } from "@aegis/shared/clientErrors/ClientErrorKind";
import { ClientErrorFallback } from "@/clientErrors/ClientErrorFallback";
import { clientErrorReporter } from "@/clientErrors/clientErrorReporter";

type ClientErrorBoundaryProps = {
  children: ReactNode;
};

type ClientErrorBoundaryState = {
  failed: boolean;
};

export class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  override state: ClientErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    clientErrorReporter.capture({
      kind: ClientErrorKind.RENDER.value,
      error,
      componentStack: info.componentStack ?? undefined,
    });
  }

  override render() {
    return this.state.failed ? <ClientErrorFallback /> : this.props.children;
  }
}
