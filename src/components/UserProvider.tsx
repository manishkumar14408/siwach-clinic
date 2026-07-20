'use client';

import { createContext, useContext } from 'react';

export interface UserContextValue {
  userId: number;
  email: string;
  name: string;
  role: string;
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue | null {
  return useContext(UserContext);
}

export function UserProvider({
  user,
  children,
}: {
  user: UserContextValue;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
