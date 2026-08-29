import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});
const db = getFirestore(app);

async function test() {
  const snapshot = await getDocs(collection(db, 'tasks'));
  const tasks = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
  console.log("Found", tasks.length, "tasks");
  const sample = tasks.slice(0, 5).map(t => ({
    id: t.id, 
    createdAt: t.createdAt, 
    type: typeof t.createdAt
  }));
  console.log("Sample tasks:", JSON.stringify(sample, null, 2));
}
test().catch(console.error);
