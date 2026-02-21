export const readRelativeFile = async (rootDir: string, relPath: string) => {
  let fs;
  let path;

  try {
    fs = await import('node:fs/promises');
    path = await import('node:path');
  } catch {
    throw new Error('File system is not available in this environment');
  }
  if (path.isAbsolute(relPath)) {
    throw new Error(`Path is not relative: '${relPath}'`);
  }

  const resolvedPath = path.resolve(rootDir, relPath);
  const realPath = await fs.realpath(resolvedPath);
  try {
    return await fs.readFile(realPath);
  } catch (error) {
    throw new Error(`Failed to load file '${realPath}'`, { cause: error });
  }
};
