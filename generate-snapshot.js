const { execSync } = require('child_process');
const path = require('path');

console.log('Generating snapshots for all templates...');

try {
  // Try to run the TypeScript file directly with Node.js
  // Since the project uses ES modules, we'll need to handle this properly
  const scriptPath = path.join(__dirname, 'template', 'generateSnapshots.ts');
  
  // Check if tsx is available
  try {
    execSync('npx tsx --version', { stdio: 'pipe' });
    console.log('Using tsx to run TypeScript...');
    execSync(`npx tsx ${scriptPath}`, { stdio: 'inherit' });
  } catch (error) {
    // Try ts-node instead
    try {
      execSync('npx ts-node --version', { stdio: 'pipe' });
      console.log('Using ts-node to run TypeScript...');
      execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
    } catch (error2) {
      // Try to install tsx first
      console.log('Installing tsx...');
      execSync('npm install -g tsx', { stdio: 'inherit' });
      console.log('Running with tsx...');
      execSync(`tsx ${scriptPath}`, { stdio: 'inherit' });
    }
  }
  
  console.log('✅ Snapshots generated successfully!');
} catch (error) {
  console.error('❌ Error generating snapshots:', error.message);
  process.exit(1);
} 