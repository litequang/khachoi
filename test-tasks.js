import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});
const db = getFirestore(app);

async function test() {
  const snapshot = await getDocs(collection(db, 'tasks'));
  const tasks = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
  
  const designingTasks = tasks.filter(t => t.status === 'DESIGNING');
  console.log("Total designing tasks:", designingTasks.length);
  
  const sample = designingTasks.map(t => ({
    name: t.name,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }));
  console.log("Sample tasks:", JSON.stringify(sample, null, 2));
}
test().catch(console.error);
