import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense, type ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientErrorBoundary } from "@/clientErrors/ClientErrorBoundary";
import { I18nProvider } from "@/i18n/I18nProvider";
import { createLazyComponent } from "@/net/createLazyComponent";

type ScreenModule = { Screen: ComponentType };

function ReadyScreen() {
  return <p>Screen ready</p>;
}

function BrokenScreen(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'cards')");
}

function renderLazyScreen(load: () => Promise<ScreenModule>) {
  const Screen = createLazyComponent({ load, pick: (module) => module.Screen });
  render(
    <I18nProvider>
      <ClientErrorBoundary>
        <Suspense fallback={<p>Loading screen</p>}>
          <Screen />
        </Suspense>
      </ClientErrorBoundary>
    </I18nProvider>,
  );
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("chunk load recovery", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the named export once its chunk loads", async () => {
    renderLazyScreen(async () => ({ Screen: ReadyScreen }));
    await settle();

    expect(screen.getByText("Screen ready")).toBeTruthy();
  });

  it("keeps the loading state instead of crashing while a failed chunk reloads the page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderLazyScreen(async () => undefined as unknown as ScreenModule);
    await settle();

    expect(screen.getByText("Loading screen")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explains a connection problem when a chunk keeps failing to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderLazyScreen(async () => {
      throw new Error("Unable to preload CSS for /assets/Home-99caLuNY.css");
    });
    await settle();

    expect(screen.getByRole("alert").textContent).toMatch(/Couldn’t load this screen/);
  });

  it("keeps the crash screen for errors that are not load failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderLazyScreen(async () => ({ Screen: BrokenScreen }));
    await settle();

    expect(screen.getByRole("alert").textContent).toMatch(/Something went wrong/);
  });

  it("hides a failed lazy dialog without replacing the page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Dialog = createLazyComponent({
      load: async (): Promise<ScreenModule> => {
        throw new TypeError("Failed to fetch dynamically imported module: /assets/InterfaceThemePicker.js");
      },
      pick: (module) => module.Screen,
    });
    render(
      <I18nProvider>
        <p>Current page</p>
        <ClientErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Dialog />
          </Suspense>
        </ClientErrorBoundary>
      </I18nProvider>,
    );
    await settle();

    expect(screen.getByText("Current page")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
