const fs = require('fs');
const path = require('path');

// Target path for MainActivity.java in com.app.acwdestiny
const primaryTarget = path.join(process.cwd(), 'android/app/src/main/java/com/app/acwdestiny/MainActivity.java');

function findMainActivityFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMainActivityFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name === 'MainActivity.java') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function patchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace "protected void onResume()" with "public void onResume()"
    // while preserving annotations, whitespace, and internal logic
    const regex = /(\bprotected\s+void\s+onResume\s*\(\s*\))/g;
    if (regex.test(content)) {
      const updated = content.replace(regex, 'public void onResume()');
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`[patch-android] Successfully changed "protected void onResume()" to "public void onResume()" in ${filePath}`);
      modified = true;
    } else if (content.includes('public void onResume()')) {
      console.log(`[patch-android] onResume() is already declared as public in ${filePath}`);
    } else {
      console.log(`[patch-android] No onResume() override detected in ${filePath}`);
    }
    return modified;
  } catch (err) {
    console.error(`[patch-android] Error processing ${filePath}:`, err.message);
    return false;
  }
}

function run() {
  const androidDir = path.join(process.cwd(), 'android');
  const targets = [];

  if (fs.existsSync(primaryTarget)) {
    targets.push(primaryTarget);
  } else if (fs.existsSync(androidDir)) {
    const found = findMainActivityFiles(androidDir);
    targets.push(...found);
  }

  if (targets.length === 0) {
    console.log('[patch-android] No android/ directory or MainActivity.java currently found to patch.');
    return;
  }

  for (const target of targets) {
    patchFile(target);
  }
}

run();
