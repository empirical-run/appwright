import { exec } from 'child_process';
import  { promisify }  from 'util';
import fs from 'fs';

const execPromise = promisify(exec);

const zipFile = './wikipedia_ios.zip';
const extractedFolder = './wikipedia_ios.app';
const appFile = './wikipedia_ios.app/Wikipedia.app';
const destinationApp = './wikipedia.app';

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
