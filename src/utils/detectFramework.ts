import { join } from 'path';
import fs from 'fs';
import { frameworkList } from '../constant.js';

export function detectFrameworkFromPackageJson(cwd: string) {
  try {
    const pkgPath = join(cwd, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const matched = frameworkList.find((framework) =>
      Object.prototype.hasOwnProperty.call(deps, framework)
    );

    return matched ?? 'unknown';
  } catch (e) {
    return 'unknown';
  }
}
