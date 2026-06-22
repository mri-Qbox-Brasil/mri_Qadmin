const fs = require('fs');
const path = require('path');

const TEXT_EXTENSIONS = new Set([
  'cfg',
  'css',
  'env',
  'html',
  'ini',
  'js',
  'json',
  'jsx',
  'lua',
  'md',
  'scss',
  'sql',
  'toml',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
]);

const TEXT_FILENAMES = new Set([
  '.editorconfig',
  '.gitignore',
]);

function normalizeRelative(input) {
  const raw = String(input || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!raw) return '';

  const parts = [];
  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..' || /[<>:"|?*]/.test(segment)) return null;
    parts.push(segment);
  }

  return parts.join('/');
}

function resolveInside(root, relativePath, allowRoot = false) {
  const safeRoot = path.resolve(String(root || ''));
  const safeRelative = normalizeRelative(relativePath);
  if (safeRelative === null || (!allowRoot && safeRelative === '')) return null;

  const absolute = safeRelative
    ? path.resolve(safeRoot, ...safeRelative.split('/'))
    : safeRoot;

  const rootWithSep = safeRoot.endsWith(path.sep) ? safeRoot : `${safeRoot}${path.sep}`;
  const lowerAbsolute = absolute.toLowerCase();
  const lowerRoot = safeRoot.toLowerCase();
  const lowerRootWithSep = rootWithSep.toLowerCase();

  if (lowerAbsolute !== lowerRoot && !lowerAbsolute.startsWith(lowerRootWithSep)) {
    return null;
  }

  return { root: safeRoot, relative: safeRelative, absolute };
}

function fileExtension(fileName) {
  return path.extname(String(fileName || '')).replace(/^\./, '').toLowerCase();
}

function isEditableTextFile(fileName) {
  const lowerName = path.basename(String(fileName || '')).toLowerCase();
  const extension = fileExtension(lowerName);
  return TEXT_FILENAMES.has(lowerName) || TEXT_EXTENSIONS.has(extension);
}

function joinRelative(basePath, childName) {
  const safeBase = normalizeRelative(basePath) || '';
  const safeChild = String(childName || '').trim();
  return safeBase ? `${safeBase}/${safeChild}` : safeChild;
}

function listResourceDirectory(root, relativePath) {
  const target = resolveInside(root, relativePath, true);
  if (!target) {
    return { ok: false, message: 'Diretorio invalido para listagem.' };
  }

  try {
    const items = fs.readdirSync(target.absolute, { withFileTypes: true });
    const entries = [];

    for (const item of items) {
      if (item.name === '.qadmin_keep') continue;

      const absolute = path.join(target.absolute, item.name);
      const relative = joinRelative(target.relative, item.name);
      let stats = null;

      try {
        stats = fs.statSync(absolute);
      } catch (_) {}

      entries.push({
        name: item.name,
        path: relative,
        isDirectory: item.isDirectory(),
        size: item.isDirectory() ? 0 : (stats ? stats.size : 0),
        modified: stats ? stats.mtime.toISOString() : null,
        extension: item.isDirectory() ? '' : fileExtension(item.name),
        editable: !item.isDirectory() && isEditableTextFile(item.name),
      });
    }

    entries.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      return left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
    });

    return { ok: true, entries };
  } catch (error) {
    return {
      ok: false,
      message: `FS bridge nao conseguiu listar pasta: ${error.message}`,
    };
  }
}

exports('QadminListPhysicalResourceDirectory', listResourceDirectory);

console.log('[mri_Qadmin] Resource FS bridge carregado.');
