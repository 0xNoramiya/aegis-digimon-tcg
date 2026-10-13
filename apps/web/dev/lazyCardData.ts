import type { Plugin } from "vite";

const sharedCardModule = /[\\/]packages[\\/]shared[\\/](dist|src)[\\/]cards[\\/][^\\/]+\.(js|ts)$/;
const sharedCardDataImport = /^\.\/data\/index(\.js)?$/;

export function lazyCardData(storeModule: string, preloadedChunkName: string): Plugin {
  return {
    name: "aegis-lazy-card-data",
    apply: "build",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer && sharedCardModule.test(importer) && sharedCardDataImport.test(source)) {
        return storeModule;
      }
      return null;
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, context) {
        const chunk = Object.values(context.bundle ?? {}).find(
          (output) => output.type === "chunk" && output.name === preloadedChunkName,
        );
        if (!chunk) {
          return [];
        }
        return [
          {
            tag: "link",
            attrs: { rel: "modulepreload", crossorigin: true, href: `/${chunk.fileName}` },
            injectTo: "head",
          },
        ];
      },
    },
  };
}
