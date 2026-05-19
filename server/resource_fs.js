const fs = require('fs');
const path = require('path');

const MAX_DELETE_DIRECTORY_ENTRIES = 2000;

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

function sameText(left, right) {
  const normalize = (value) => String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return normalize(left) === normalize(right);
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

function writeResourceFile(root, relativePath, content) {
  const target = resolveInside(root, relativePath);
  if (!target) {
    return { ok: false, message: 'Arquivo invalido para gravacao.' };
  }

  const text = String(content ?? '');

  try {
    fs.mkdirSync(path.dirname(target.absolute), { recursive: true });
    fs.writeFileSync(target.absolute, text, 'utf8');

    const written = fs.readFileSync(target.absolute, 'utf8');
    if (!sameText(written, text)) {
      return {
        ok: false,
        message: `Arquivo gravado pelo FS bridge, mas verificacao divergiu. gravado=${written.length} esperado=${text.length}`,
      };
    }

    return {
      ok: true,
      absolute: target.absolute,
      size: Buffer.byteLength(text, 'utf8'),
    };
  } catch (error) {
    return {
      ok: false,
      message: `FS bridge nao conseguiu salvar: ${error.message}`,
    };
  }
}

function createResourceDirectory(root, relativePath) {
  const target = resolveInside(root, relativePath);
  if (!target) {
    return { ok: false, message: 'Pasta invalida para criacao.' };
  }

  try {
    fs.mkdirSync(target.absolute, { recursive: true });
    return { ok: true, absolute: target.absolute };
  } catch (error) {
    return {
      ok: false,
      message: `FS bridge nao conseguiu criar pasta: ${error.message}`,
    };
  }
}

function countDirectoryEntries(directory, limit) {
  let count = 0;
  const stack = [directory];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      count += 1;
      if (count > limit) return count;

      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
      }
    }
  }

  return count;
}

function deleteResourceEntry(root, relativePath, expectedKind) {
  const target = resolveInside(root, relativePath);
  if (!target) {
    return { ok: false, message: 'Entrada invalida para exclusao.' };
  }

  try {
    if (!fs.existsSync(target.absolute)) {
      return { ok: false, message: 'Arquivo ou pasta nao existe mais no disco.' };
    }

    const stat = fs.statSync(target.absolute);
    const wantsFolder = expectedKind === 'folder' || expectedKind === true;
    const wantsFile = expectedKind === 'file' || expectedKind === false;

    if (wantsFolder && !stat.isDirectory()) {
      return { ok: false, message: 'A entrada selecionada nao e uma pasta.' };
    }

    if (wantsFile && !stat.isFile()) {
      return { ok: false, message: 'A entrada selecionada nao e um arquivo.' };
    }

    if (stat.isDirectory()) {
      const entryCount = countDirectoryEntries(target.absolute, MAX_DELETE_DIRECTORY_ENTRIES);
      if (entryCount > MAX_DELETE_DIRECTORY_ENTRIES) {
        return {
          ok: false,
          message: `Pasta muito grande para excluir pelo painel (${entryCount}+ entradas). Apague manualmente no Windows.`,
        };
      }

      fs.rmSync(target.absolute, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    } else {
      fs.unlinkSync(target.absolute);
    }

    return { ok: true, absolute: target.absolute, isDirectory: stat.isDirectory() };
  } catch (error) {
    return {
      ok: false,
      message: `FS bridge nao conseguiu excluir: ${error.message}`,
    };
  }
}

exports('QadminWritePhysicalResourceFile', writeResourceFile);
exports('QadminCreatePhysicalResourceDirectory', createResourceDirectory);
exports('QadminDeletePhysicalResourceEntry', deleteResourceEntry);
exports('QadminListPhysicalResourceDirectory', listResourceDirectory);

console.log('[mri_Qadmin] Resource FS bridge carregado.');
