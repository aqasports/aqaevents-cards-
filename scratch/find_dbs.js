const fs = require('fs');
const path = require('path');

function findDbFiles(dir, filesList = []) {
  if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git')) {
    return filesList;
  }
  
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findDbFiles(filePath, filesList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
          filesList.push({ path: filePath, size: stat.size });
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return filesList;
}

const rootDir = path.resolve(__dirname, '..');
console.log('Searching for database files in:', rootDir);
const dbs = findDbFiles(rootDir);
console.log('Database files found:', dbs);
