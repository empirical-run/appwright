import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execPromise = promisify(exec);

const zipFile = './builds/wikipedia_ios.zip';
const extractedFolder = './builds/wikipedia_ios.app';
const appFile = './builds/wikipedia_ios.app/Wikipedia.app';
const destinationApp = './builds/Wikipedia.app';

async function extractApp() {
  try {
    await execPromise(`unzip -o ${zipFile} -d ${extractedFolder}`);
    await execPromise(`cp -r ${appFile} ${destinationApp}`);
    fs.rmSync(extractedFolder, { recursive: true });
  } catch (error) {
    console.error(`extractApp: ${error.message}`);
  }
}

extractApp(); 
