import { exec } from 'child_process';
import  { promisify }  from 'util';

const execPromise = promisify(exec);

const zipFile = './wikipedia_ios.zip';
const extractedFolder = './wikipedia_ios.app';
const appFile = './wikipedia_ios.app/Wikipedia.app';
const destinationApp = './wikipedia.app';

const command = `unzip -o ${zipFile} -d ${extractedFolder} && cp -r ${appFile} ${destinationApp} && pwd && rm -rf ${extractedFolder}`;

async function extractApp() {
  try {
    const { stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`extractApp: ${stderr}`);
      return;
    }
   } catch (error) {
    console.error(`extractApp: ${error.message}`);
  }
}

extractApp();
