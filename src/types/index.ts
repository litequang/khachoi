export type Role = "ADMIN" | "DESIGNER" | "SALE";
export type TaskStatus = "DESIGNING" | "WAITING_DEPOSIT" | "SAPO_ORDERED" | "NO_ORDER";

export interface User {
  uid: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: any; // Firestore Timestamp
  createdByUid: string | null;
}

export interface Task {
  id: string;
  name: string;
  url: string;
  status: TaskStatus;
  linkClickCount: number;
  sapoOrderCode: string | null;
  
  createdAt: any;
  updatedAt: any;
  designCompletedAt: any | null;
  sapoOrderedAt: any | null;
  noOrderAt: any | null;

  createdByUid: string;
  createdByName: string | null;
  updatedByUid: string;
  updatedByName: string | null;
}
