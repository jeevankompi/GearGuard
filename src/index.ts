import 'dotenv/config';

import { getFirebaseApp } from './firebase';
import { greet } from './greet';

const [command] = process.argv.slice(2);

if (command === 'firebase:ping') {
  // Simple init check; does not read/write data.
  const app = getFirebaseApp();
  console.log('Firebase initialized OK');
  console.log('Project ID:', app.options.projectId ?? '(unknown)');
} else {
  const name: string = command ?? 'World';
  console.log(greet(name));
}
