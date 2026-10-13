import { mkdirSync, readdirSync, renameSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";

function listSourceMaps(directory) {
  const maps = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      maps.push(...listSourceMaps(path));
    } else if (entry.isFile() && /\.map(\.br|\.gz)?$/.test(entry.name)) {
      maps.push(path);
    }
  }
  return maps;
}

function moveFile(source, destination) {
  try {
    renameSync(source, destination);
  } catch (error) {
    if (error.code !== "EXDEV") {
      throw error;
    }
    copyFileSync(source, destination);
    rmSync(source);
  }
}

export function relocateSourceMaps({ webDirectory, destination }) {
  const maps = listSourceMaps(webDirectory);
  for (const source of maps) {
    const target = join(destination, relative(webDirectory, source));
    mkdirSync(dirname(target), { recursive: true, mode: 0o750 });
    moveFile(source, target);
  }
  return maps.length;
}
